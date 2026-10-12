import { supabase } from '@/lib/supabase'
import type { Database } from '@mindtrack/shared'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']
type Course = Database['public']['Tables']['courses']['Row']
type Reminder = Database['public']['Tables']['reminders']['Row']
type Notification = Database['public']['Tables']['notifications']['Row']
type FocusSession = Database['public']['Tables']['focus_sessions']['Row']
type ClassMeeting = Database['public']['Tables']['class_meetings']['Row']

// ─── Tasks ──────────────────────────────────────────────────────────────────

export async function fetchTasks(filters?: {
  status?: string
  course_id?: string
  type?: string
}) {
  let q = supabase.from('tasks').select('*, course:courses(id,name,color,code)').order('due_at', { ascending: true, nullsFirst: false })
  if (filters?.status) q = q.eq('status', filters.status as Task['status'])
  if (filters?.course_id) q = q.eq('course_id', filters.course_id)
  if (filters?.type) q = q.eq('type', filters.type as Task['type'])
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function fetchTask(id: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, course:courses(id,name,color,code), reminders(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createTask(task: TaskInsert) {
  const { data, error } = await supabase.from('tasks').insert(task).select().single()
  if (error) throw error
  return data
}

export async function updateTask(id: string, task: TaskUpdate) {
  const { data, error } = await supabase.from('tasks').update(task).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function completeTask(taskId: string) {
  const { data, error } = await supabase.rpc('complete_task', { task_id: taskId })
  if (error) throw error
  return data
}

// ─── Courses ────────────────────────────────────────────────────────────────

export async function fetchCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .is('archived_at', null)
    .order('name')
  if (error) throw error
  return data
}

export async function createCourse(course: Database['public']['Tables']['courses']['Insert']) {
  const { data, error } = await supabase.from('courses').insert(course).select().single()
  if (error) throw error
  return data
}

export async function updateCourse(id: string, course: Database['public']['Tables']['courses']['Update']) {
  const { data, error } = await supabase.from('courses').update(course).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function archiveCourse(id: string) {
  const { error } = await supabase.from('courses').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ─── Class Meetings ─────────────────────────────────────────────────────────

export async function fetchClassMeetings(courseId?: string) {
  let q = supabase.from('class_meetings').select('*, course:courses(id,name,color,code)').order('weekday').order('start_time')
  if (courseId) q = q.eq('course_id', courseId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function createClassMeeting(meeting: Database['public']['Tables']['class_meetings']['Insert']) {
  const { data, error } = await supabase.from('class_meetings').insert(meeting).select().single()
  if (error) throw error
  return data
}

export async function updateClassMeeting(id: string, meeting: Database['public']['Tables']['class_meetings']['Update']) {
  const { data, error } = await supabase.from('class_meetings').update(meeting).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteClassMeeting(id: string) {
  const { error } = await supabase.from('class_meetings').delete().eq('id', id)
  if (error) throw error
}

// ─── Reminders ──────────────────────────────────────────────────────────────

export async function snoozeReminder(reminderId: string, minutes: number) {
  const { data, error } = await supabase.rpc('snooze_reminder', { reminder_id: reminderId, minutes })
  if (error) throw error
  return data
}

export async function dismissReminder(reminderId: string) {
  const { data, error } = await supabase.rpc('dismiss_reminder', { reminder_id: reminderId })
  if (error) throw error
  return data
}

// ─── Notifications ──────────────────────────────────────────────────────────

export async function fetchNotifications(limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, reminder:reminders(id,status,task_id,class_meeting_id,source,snoozed_until)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead() {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
  if (error) throw error
}

export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

/** Call this on page load to claim any due reminders and generate alert notifications. */
export async function syncDueNotifications(): Promise<{ status: string; synced: number; timezone: string }> {
  const { data, error } = await supabase.rpc('sync_due_notifications')
  if (error) throw error
  return data as any
}

// ─── Focus Sessions ──────────────────────────────────────────────────────────

export async function startFocus(taskId: string | undefined, plannedMinutes: number) {
  const { data, error } = await supabase.rpc('start_focus', {
    task_id: taskId ?? null,
    planned_minutes: plannedMinutes,
  })
  if (error) throw error
  return data
}

export async function finishFocus(sessionId: string, status: 'completed' | 'abandoned') {
  const { data, error } = await supabase.rpc('finish_focus', { session_id: sessionId, status })
  if (error) throw error
  return data
}

// ─── Agenda / Dashboard ──────────────────────────────────────────────────────

export async function getAgenda(from: string, to: string) {
  const { data, error } = await supabase.rpc('get_agenda', { from_ts: from, to_ts: to })
  if (error) throw error
  return data
}

export async function getDashboardSummary() {
  const { data, error } = await supabase.rpc('get_dashboard_summary')
  if (error) throw error
  return data
}

// ─── Push subscriptions ──────────────────────────────────────────────────────

export async function savePushSubscription(sub: PushSubscription) {
  const key = sub.getKey('p256dh')
  const auth = sub.getKey('auth')
  if (!key || !auth) throw new Error('Invalid push subscription keys')
  const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)))
  const authStr = btoa(String.fromCharCode(...new Uint8Array(auth)))
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: sub.endpoint, p256dh, auth: authStr,
  }, { onConflict: 'endpoint' })
  if (error) throw error
}

export async function deletePushSubscription(endpoint: string) {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) throw error
}

export type { Task, Course, Reminder, Notification, FocusSession, ClassMeeting }
