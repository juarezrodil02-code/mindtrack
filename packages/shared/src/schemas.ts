import { z } from 'zod'

// ─── Enums ─────────────────────────────────────────────────────────────────

export const TaskTypeSchema = z.enum(['assignment', 'exam', 'quiz', 'reading', 'project', 'study'])
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high'])
export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'done'])
export const ReminderStatusSchema = z.enum(['pending', 'sent', 'dismissed', 'cancelled'])
export const ReminderSourceSchema = z.enum(['rule', 'custom', 'class'])
export const FocusStatusSchema = z.enum(['running', 'completed', 'abandoned'])

export type TaskType = z.infer<typeof TaskTypeSchema>
export type TaskPriority = z.infer<typeof TaskPrioritySchema>
export type TaskStatus = z.infer<typeof TaskStatusSchema>
export type ReminderStatus = z.infer<typeof ReminderStatusSchema>
export type ReminderSource = z.infer<typeof ReminderSourceSchema>
export type FocusStatus = z.infer<typeof FocusStatusSchema>

// ─── Profile ───────────────────────────────────────────────────────────────

export const DefaultReminderRulesSchema = z.object({
  exam: z.array(z.number()).default([10080, 4320, 1440, 120]),
  quiz: z.array(z.number()).default([1440, 120]),
  assignment: z.array(z.number()).default([2880, 180]),
  project: z.array(z.number()).default([10080, 2880, 180]),
  reading: z.array(z.number()).default([720]),
  study: z.array(z.number()).default([30]),
})

export const ProfileUpdateSchema = z.object({
  name: z.string().max(100).optional().nullable().or(z.literal('')),
  timezone: z.string().min(1).max(100).optional(),
  quiet_start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional().or(z.literal('')),
  quiet_end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional().or(z.literal('')),
  focus_minutes: z.union([z.number().int().min(1).max(120), z.nan()]).optional().nullable(),
  break_minutes: z.union([z.number().int().min(1).max(60), z.nan()]).optional().nullable(),
  long_break_minutes: z.union([z.number().int().min(1).max(120), z.nan()]).optional().nullable(),
  notify_push: z.boolean().optional(),
  default_reminder_rules: DefaultReminderRulesSchema.optional(),
})

// ─── Course ────────────────────────────────────────────────────────────────

export const CourseCreateSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(20).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  term: z.string().max(50).optional().nullable(),
})

export const CourseUpdateSchema = CourseCreateSchema.partial()

export type CourseCreate = z.infer<typeof CourseCreateSchema>
export type CourseUpdate = z.infer<typeof CourseUpdateSchema>

// ─── Class Meeting ─────────────────────────────────────────────────────────

export const ClassMeetingCreateSchema = z.object({
  course_id: z.string().uuid(),
  weekday: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  location: z.string().max(200).optional().nullable(),
  remind_minutes_before: z.number().int().min(1).max(1440).optional().nullable(),
})

export const ClassMeetingUpdateSchema = ClassMeetingCreateSchema.partial()

export type ClassMeetingCreate = z.infer<typeof ClassMeetingCreateSchema>
export type ClassMeetingUpdate = z.infer<typeof ClassMeetingUpdateSchema>

// ─── Task ──────────────────────────────────────────────────────────────────

export const TaskDueAtSchema = z
  .union([
    z.string().datetime({ offset: true }),
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
    z.literal(''),
  ])
  .optional()
  .nullable()

export const TaskCourseIdSchema = z
  .union([z.string().uuid(), z.literal('')])
  .optional()
  .nullable()

export const TaskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  notes: z.string().max(5000).optional().nullable().or(z.literal('')),
  type: TaskTypeSchema.default('assignment'),
  priority: TaskPrioritySchema.default('medium'),
  due_at: TaskDueAtSchema,
  estimated_minutes: z.union([z.number().int().min(1), z.nan()]).optional().nullable(),
  course_id: TaskCourseIdSchema,
  status: TaskStatusSchema.default('todo'),
})

export const TaskUpdateSchema = TaskCreateSchema.partial()

export const QuickAddTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  course_id: TaskCourseIdSchema,
  due_at: TaskDueAtSchema,
  type: TaskTypeSchema.default('assignment'),
})

export type TaskCreate = z.infer<typeof TaskCreateSchema>
export type TaskUpdate = z.infer<typeof TaskUpdateSchema>
export type QuickAddTask = z.infer<typeof QuickAddTaskSchema>

// ─── Reminder ──────────────────────────────────────────────────────────────

export const CustomReminderCreateSchema = z.object({
  task_id: z.string().uuid(),
  remind_at: z.string().datetime({ offset: true }),
})

export const SnoozeReminderSchema = z.object({
  reminder_id: z.string().uuid(),
  minutes: z.union([z.literal(10), z.literal(60), z.literal(480)]), // 10min, 1h, tomorrow ~8h
})

export type CustomReminderCreate = z.infer<typeof CustomReminderCreateSchema>
export type SnoozeReminder = z.infer<typeof SnoozeReminderSchema>

// ─── Focus Session ─────────────────────────────────────────────────────────

export const StartFocusSchema = z.object({
  task_id: z.string().uuid().optional(),
  planned_minutes: z.number().int().min(1).max(180),
})

export const FinishFocusSchema = z.object({
  session_id: z.string().uuid(),
  status: z.enum(['completed', 'abandoned']),
})

export type StartFocus = z.infer<typeof StartFocusSchema>
export type FinishFocus = z.infer<typeof FinishFocusSchema>

// ─── Default reminder rules ────────────────────────────────────────────────

export const DEFAULT_REMINDER_RULES: Record<TaskType, number[]> = {
  exam: [10080, 4320, 1440, 120],
  quiz: [1440, 120],
  assignment: [2880, 180],
  project: [10080, 2880, 180],
  reading: [720],
  study: [30],
}

// ─── Snooze options ────────────────────────────────────────────────────────

export const SNOOZE_OPTIONS = [
  { label: '10 minutes', minutes: 10 },
  { label: '1 hour', minutes: 60 },
  { label: 'Tomorrow morning', minutes: 480 },
] as const

// ─── Task type labels ──────────────────────────────────────────────────────

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  assignment: 'Assignment',
  exam: 'Exam',
  quiz: 'Quiz',
  reading: 'Reading',
  project: 'Project',
  study: 'Study Block',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAY_FULL_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
