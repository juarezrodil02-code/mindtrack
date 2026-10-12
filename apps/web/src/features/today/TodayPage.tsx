import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/app/AuthProvider'
import { useTasks, useCompleteTask } from '@/features/tasks/hooks'
import { useNotifications, useMarkRead, useSnoozeReminder, useDismissReminder } from '@/features/notifications/hooks'
import { formatDueDate } from '@/lib/dateUtils'
import { AlertTriangle, Clock, BookOpen, CheckCircle, Timer, Bell, ChevronDown } from 'lucide-react'
import { TASK_TYPE_LABELS, SNOOZE_OPTIONS } from '@mindtrack/shared'
import { isToday, isPast, parseISO } from 'date-fns'
import { TaskFormModal } from '@/features/tasks/TaskFormModal'
import { fetchClassMeetings } from '@/lib/api'
import { WEEKDAY_LABELS } from '@mindtrack/shared'

export function TodayPage() {
  const { profile } = useAuth()
  const tz = profile?.timezone ?? 'Asia/Manila'
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks()
  const { data: notifications } = useNotifications()
  const { data: meetings } = useQuery({
    queryKey: ['class_meetings'],
    queryFn: () => fetchClassMeetings(),
  })
  const completeTask = useCompleteTask()
  const markRead = useMarkRead()
  const snooze = useSnoozeReminder()
  const dismiss = useDismissReminder()
  const [editTask, setEditTask] = useState<string | null>(null)
  const [snoozeOpen, setSnoozeOpen] = useState<string | null>(null)

  const todayWeekday = new Date().getDay()

  const overdueTasks = tasks?.filter(t =>
    t.due_at && isPast(parseISO(t.due_at)) && !isToday(parseISO(t.due_at)) && t.status !== 'done'
  ) ?? []

  const todayTasks = tasks?.filter(t =>
    t.due_at && isToday(parseISO(t.due_at)) && t.status !== 'done'
  ) ?? []

  const todayClasses = meetings?.filter(m => m.weekday === todayWeekday) ?? []

  const activeNotifs = notifications?.filter(n => !n.read_at).slice(0, 5) ?? []

  if (tasksLoading) return <div className="page-loading"><div className="spinner" /><p>Loading your day…</p></div>
  if (tasksError) return <div className="page-error"><AlertTriangle size={24} /><p>Failed to load tasks</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Today</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz })}
          </p>
        </div>
      </div>

      <div className="today-grid">
        {/* Active reminders */}
        {activeNotifs.length > 0 && (
          <section className="today-section">
            <h2 className="section-title">
              <Bell size={16} className="section-icon section-icon--alert" />
              Reminders
            </h2>
            <div className="notif-list">
              {activeNotifs.map(n => (
                <div key={n.id} className="notif-card">
                  <div className="notif-body">
                    <p className="notif-title">{n.title}</p>
                    <p className="notif-text">{n.body}</p>
                  </div>
                  <div className="notif-actions">
                    <div className="snooze-wrapper">
                      <button
                        className="btn btn--ghost btn--xs"
                        onClick={() => setSnoozeOpen(snoozeOpen === n.id ? null : n.id)}
                        aria-expanded={snoozeOpen === n.id}
                      >
                        Snooze <ChevronDown size={12} />
                      </button>
                      {snoozeOpen === n.id && (
                        <div className="snooze-menu" role="menu">
                          {SNOOZE_OPTIONS.map(opt => (
                            <button
                              key={opt.minutes}
                              className="snooze-option"
                              role="menuitem"
                              onClick={() => {
                                if (n.reminder?.id) snooze.mutate({ id: n.reminder.id, minutes: opt.minutes })
                                markRead.mutate(n.id)
                                setSnoozeOpen(null)
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn--ghost btn--xs"
                      onClick={() => {
                        if (n.reminder?.id) dismiss.mutate(n.reminder.id)
                        markRead.mutate(n.id)
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Overdue */}
        {overdueTasks.length > 0 && (
          <section className="today-section">
            <h2 className="section-title section-title--danger">
              <AlertTriangle size={16} className="section-icon" />
              Overdue ({overdueTasks.length})
            </h2>
            <div className="task-list">
              {overdueTasks.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  tz={tz}
                  onComplete={() => completeTask.mutate(t.id)}
                  onEdit={() => setEditTask(t.id)}
                  isOverdue
                />
              ))}
            </div>
          </section>
        )}

        {/* Today's classes */}
        {todayClasses.length > 0 && (
          <section className="today-section">
            <h2 className="section-title">
              <BookOpen size={16} className="section-icon section-icon--blue" />
              Classes today
            </h2>
            <div className="class-list">
              {todayClasses.map(m => (
                <div key={m.id} className="class-card" style={{ borderLeftColor: (m as any).course?.color ?? '#6366f1' }}>
                  <div className="class-time">
                    {m.start_time.slice(0, 5)} – {m.end_time.slice(0, 5)}
                  </div>
                  <div className="class-info">
                    <p className="class-name">{(m as any).course?.name ?? 'Class'}</p>
                    {m.location && <p className="class-location">{m.location}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Due today */}
        <section className="today-section">
          <h2 className="section-title">
            <Clock size={16} className="section-icon section-icon--indigo" />
            Due today {todayTasks.length > 0 ? `(${todayTasks.length})` : ''}
          </h2>
          {todayTasks.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={32} className="empty-icon" />
              <p className="empty-title">All clear!</p>
              <p className="empty-text">Nothing due today. Press <kbd>Q</kbd> to add a task.</p>
            </div>
          ) : (
            <div className="task-list">
              {todayTasks.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  tz={tz}
                  onComplete={() => completeTask.mutate(t.id)}
                  onEdit={() => setEditTask(t.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {editTask && <TaskFormModal taskId={editTask} onClose={() => setEditTask(null)} />}
    </div>
  )
}

function TaskCard({ task, tz, onComplete, onEdit, isOverdue }: {
  task: any; tz: string; onComplete: () => void; onEdit: () => void; isOverdue?: boolean
}) {
  return (
    <div className={`task-card ${isOverdue ? 'task-card--overdue' : ''}`}>
      <button
        className="task-check"
        onClick={onComplete}
        aria-label={`Mark "${task.title}" as done`}
      >
        <CheckCircle size={18} />
      </button>
      <div className="task-body" onClick={onEdit} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onEdit()}>
        <div className="task-header-row">
          <span className="task-title">{task.title}</span>
          {task.priority === 'high' && <span className="priority-badge priority-badge--high">High</span>}
          {task.priority === 'medium' && <span className="priority-badge priority-badge--med">Med</span>}
        </div>
        <div className="task-meta">
          {task.course && (
            <span className="task-course" style={{ borderColor: task.course.color, color: task.course.color }}>
              {task.course.code || task.course.name}
            </span>
          )}
          <span className={`task-type-badge task-type-badge--${task.type}`}>
            {TASK_TYPE_LABELS[task.type as keyof typeof TASK_TYPE_LABELS]}
          </span>
          {task.due_at && (
            <span className={`task-due ${isOverdue ? 'task-due--overdue' : ''}`}>
              {formatDueDate(task.due_at, tz)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
