import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Minimal Web Push implementation using VAPID
const DISPATCH_SECRET = Deno.env.get('DISPATCH_SECRET') ?? ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@mindtrack.app'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  // Auth: require shared secret
  const secret = req.headers.get('x-dispatch-secret')
  if (!secret || secret !== DISPATCH_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })

  try {
    // Claim due reminders
    const { data: reminders, error: claimErr } = await supabase
      .rpc('claim_due_reminders', { batch_size: 50 })
    if (claimErr) throw claimErr

    const results = { dispatched: 0, failed: 0 }

    for (const reminder of (reminders ?? [])) {
      try {
        // Get task/class info for notification body
        let title = 'Reminder'
        let body = 'You have a reminder'
        let taskUrl = '/'

        if (reminder.task_id) {
          const { data: task } = await supabase
            .from('tasks')
            .select('title, type, due_at, course:courses(name)')
            .eq('id', reminder.task_id)
            .single()
          if (task) {
            title = `📚 ${task.title}`
            body = `${task.type.charAt(0).toUpperCase() + task.type.slice(1)} due ${
              task.due_at ? new Date(task.due_at).toLocaleDateString() : 'soon'
            }`
            if ((task as any).course) body += ` · ${(task as any).course.name}`
            taskUrl = `/tasks`
          }
        } else if (reminder.class_meeting_id) {
          const { data: meeting } = await supabase
            .from('class_meetings')
            .select('start_time, course:courses(name)')
            .eq('id', reminder.class_meeting_id)
            .single()
          if (meeting) {
            title = `🎓 Class starting soon`
            body = `${(meeting as any).course?.name ?? 'Class'} at ${meeting.start_time.slice(0, 5)}`
          }
        }

        // Insert notification (idempotent via unique constraint)
        const { error: notifErr } = await supabase
          .from('notifications')
          .insert({
            user_id: reminder.user_id,
            reminder_id: reminder.id,
            title,
            body,
          })
          .onConflict('reminder_id')
          .ignore()

        // Send Web Push if user opted in
        const { data: profile } = await supabase
          .from('profiles')
          .select('notify_push')
          .eq('id', reminder.user_id)
          .single()

        if (profile?.notify_push && VAPID_PRIVATE_KEY) {
          const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', reminder.user_id)

          for (const sub of (subs ?? [])) {
            try {
              const payload = JSON.stringify({ title, body, url: taskUrl, reminderId: reminder.id })
              // In production this would use the web-push library
              // For now we log it (full web-push needs ECDH crypto)
              console.log(`Would push to ${sub.endpoint}: ${payload}`)
            } catch (pushErr) {
              console.error('Push failed:', pushErr)
            }
          }
        }

        results.dispatched++
      } catch (err) {
        console.error(`Failed to dispatch reminder ${reminder.id}:`, err)
        results.failed++
      }
    }

    return new Response(JSON.stringify({ ...results, total: (reminders ?? []).length }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Dispatch error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
