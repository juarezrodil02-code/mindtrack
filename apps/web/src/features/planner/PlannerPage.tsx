import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/AuthProvider'
import { fetchClassMeetings, fetchTasks, updateTask, completeTask } from '@/lib/api'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import {
  ChevronLeft, ChevronRight, BookOpen, CheckSquare, Plus,
  CheckCircle2, Circle, Timer, Filter, Calendar as CalendarIcon,
  ArrowUpRight, Clock
} from 'lucide-react'
import { useState } from 'react'
import { WEEKDAY_LABELS, TASK_TYPE_LABELS } from '@mindtrack/shared'
import { useNavigate } from 'react-router-dom'
import { TaskFormModal } from '@/features/tasks/TaskFormModal'

type FilterType = 'all' | 'tasks' | 'classes'

export function PlannerPage() {
  const { profile } = useAuth()
  const tz = profile?.timezone ?? 'Asia/Manila'
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [editTaskId, setEditTaskId] = useState<string | null>(null)
  const [createDate, setCreateDate] = useState<Date | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const { data: meetings, isLoading: meetingsLoading } = useQuery({
    queryKey: ['class_meetings'],
    queryFn: () => fetchClassMeetings(),
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'planner'],
    queryFn: () => fetchTasks(),
  })

  // Task status toggle mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, isDone }: { id: string; isDone: boolean }) => {
      if (isDone) {
        return updateTask(id, { status: 'todo' })
      } else {
        return completeTask(id)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function prevWeek() { setWeekStart(d => addDays(d, -7)) }
  function nextWeek() { setWeekStart(d => addDays(d, 7)) }
  function goToday() { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 })) }

  function handleAddTask(date?: Date) {
    setEditTaskId(null)
    setCreateDate(date ?? new Date())
    setModalOpen(true)
  }

  function handleEditTask(taskId: string) {
    setEditTaskId(taskId)
    setCreateDate(null)
    setModalOpen(true)
  }

  return (
    <div className="page">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Planner</h1>
          <p className="page-subtitle">Interactive weekly study and class schedule</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Filter pills */}
          <div className="filter-pill-group">
            <button
              className={`filter-pill ${filterType === 'all' ? 'filter-pill--active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={`filter-pill ${filterType === 'tasks' ? 'filter-pill--active' : ''}`}
              onClick={() => setFilterType('tasks')}
            >
              Tasks
            </button>
            <button
              className={`filter-pill ${filterType === 'classes' ? 'filter-pill--active' : ''}`}
              onClick={() => setFilterType('classes')}
            >
              Classes
            </button>
          </div>

          {/* Week navigation */}
          <div className="week-nav">
            <button className="icon-btn" onClick={prevWeek} aria-label="Previous week" title="Previous week">
              <ChevronLeft size={18} />
            </button>
            <span className="week-label">
              {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </span>
            <button className="icon-btn" onClick={nextWeek} aria-label="Next week" title="Next week">
              <ChevronRight size={18} />
            </button>
            <button className="btn btn--ghost btn--sm" onClick={goToday}>
              Today
            </button>
          </div>

          <button
            id="planner-add-task-btn"
            className="btn btn--primary btn--sm"
            onClick={() => handleAddTask(new Date())}
          >
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div className="week-grid">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, new Date())
          const dayMeetings = filterType === 'tasks'
            ? []
            : (meetings?.filter(m => m.weekday === i) ?? [])

          const dayTasks = filterType === 'classes'
            ? []
            : (tasks?.filter(t => {
                if (!t.due_at) return false
                const local = toZonedTime(new Date(t.due_at), tz)
                return isSameDay(local, toZonedTime(day, tz))
              }) ?? [])

          const totalItems = dayMeetings.length + dayTasks.length

          return (
            <div key={i} className={`week-day ${isToday ? 'week-day--today' : ''}`}>
              <div className="week-day-header">
                <div className="week-day-header-info">
                  <span className="week-day-name">{WEEKDAY_LABELS[i]}</span>
                  <span className={`week-day-num ${isToday ? 'week-day-num--today' : ''}`}>
                    {format(day, 'd')}
                  </span>
                </div>
                <button
                  type="button"
                  className="week-day-add-btn"
                  onClick={() => handleAddTask(day)}
                  title={`Add task for ${format(day, 'EEEE, MMM d')}`}
                  aria-label={`Add task for ${format(day, 'EEEE, MMM d')}`}
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="week-day-events">
                {/* Class Meetings */}
                {dayMeetings.map(m => (
                  <div
                    key={m.id}
                    className="week-event week-event--class"
                    style={{ borderLeftColor: (m as any).course?.color ?? '#6366f1' }}
                    onClick={() => navigate('/courses')}
                    title={`Class: ${(m as any).course?.name || 'Class'} (${m.start_time.slice(0, 5)} - ${m.end_time.slice(0, 5)})${m.location ? ` @ ${m.location}` : ''} - Click to view Courses`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate('/courses')}
                  >
                    <BookOpen size={11} className="week-event-icon" />
                    <span className="week-event-title">
                      {(m as any).course?.code || (m as any).course?.name}
                    </span>
                    <span className="week-event-time">{m.start_time.slice(0, 5)}</span>
                  </div>
                ))}

                {/* Tasks */}
                {dayTasks.map(t => {
                  const isDone = t.status === 'done'
                  const courseColor = (t as any).course?.color
                  let dueTimeStr = ''
                  if (t.due_at) {
                    try {
                      const zoned = toZonedTime(new Date(t.due_at), tz)
                      dueTimeStr = format(zoned, 'h:mm a')
                    } catch {}
                  }

                  return (
                    <div
                      key={t.id}
                      className={`week-event week-event--task ${isDone ? 'week-event--done' : ''}`}
                      style={courseColor ? { borderLeftColor: courseColor } : undefined}
                      onClick={() => handleEditTask(t.id)}
                      title={`Task: "${t.title}" - Click to edit or view details`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleEditTask(t.id)}
                    >
                      {/* Interactive completion toggle */}
                      <button
                        type="button"
                        className="week-event-check"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleTaskMutation.mutate({ id: t.id, isDone })
                        }}
                        title={isDone ? 'Mark as to do' : 'Mark as done'}
                        aria-label={isDone ? 'Mark as to do' : 'Mark as done'}
                      >
                        {isDone ? (
                          <CheckCircle2 size={13} className="text-emerald" />
                        ) : (
                          <Circle size={13} />
                        )}
                      </button>

                      <span className="week-event-title">{t.title}</span>

                      <div className="week-event-meta">
                        {t.priority === 'high' && (
                          <span className="week-event-dot week-event-dot--high" title="High Priority" />
                        )}
                        {dueTimeStr && dueTimeStr !== '12:00 AM' && (
                          <span className="week-event-time">{dueTimeStr}</span>
                        )}
                        {/* Start Focus Timer Button */}
                        {!isDone && (
                          <button
                            type="button"
                            className="week-event-focus-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/focus?taskId=${t.id}`)
                            }}
                            title={`Start Focus Timer for "${t.title}"`}
                            aria-label={`Start Focus Timer for "${t.title}"`}
                          >
                            <Timer size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Quick Add Slot when hovered or empty */}
                {totalItems === 0 && (
                  <div
                    className="week-day-empty-slot"
                    onClick={() => handleAddTask(day)}
                    title={`Click to schedule a task on ${format(day, 'MMM d')}`}
                  >
                    <Plus size={12} />
                    <span>Add task</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Responsive list fallback for smaller screens */}
      <div className="planner-list">
        {weekDays.map((day, i) => {
          const dayMeetings = filterType === 'tasks' ? [] : (meetings?.filter(m => m.weekday === i) ?? [])
          const dayTasks = filterType === 'classes' ? [] : (tasks?.filter(t => {
            if (!t.due_at) return false
            const local = toZonedTime(new Date(t.due_at), tz)
            return isSameDay(local, toZonedTime(day, tz))
          }) ?? [])

          return (
            <div key={i} className="planner-day">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 className="planner-day-header" style={{ margin: 0 }}>
                  {format(day, 'EEEE, MMM d')}
                </h3>
                <button
                  className="btn btn--xs btn--ghost"
                  onClick={() => handleAddTask(day)}
                >
                  <Plus size={13} /> Add
                </button>
              </div>

              {dayMeetings.map(m => (
                <div
                  key={m.id}
                  className="planner-event planner-event--class"
                  onClick={() => navigate('/courses')}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                >
                  <BookOpen size={14} />
                  <span>{(m as any).course?.name} · {m.start_time.slice(0, 5)}</span>
                </div>
              ))}

              {dayTasks.map(t => {
                const isDone = t.status === 'done'
                return (
                  <div
                    key={t.id}
                    className={`planner-event planner-event--task ${isDone ? 'week-event--done' : ''}`}
                    onClick={() => handleEditTask(t.id)}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                  >
                    <button
                      type="button"
                      className="week-event-check"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTaskMutation.mutate({ id: t.id, isDone })
                      }}
                    >
                      {isDone ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                    </button>
                    <span style={{ flex: 1 }}>{t.title}</span>
                    <button
                      className="btn btn--xs btn--ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/focus?taskId=${t.id}`)
                      }}
                      title="Focus"
                    >
                      <Timer size={13} />
                    </button>
                  </div>
                )
              })}

              {!dayMeetings.length && !dayTasks.length && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontStyle: 'italic', margin: '4px 0' }}>
                  No classes or deadlines scheduled
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Task Creation / Edit Modal */}
      {modalOpen && (
        <TaskFormModal
          taskId={editTaskId ?? undefined}
          initialDueDate={createDate ?? undefined}
          onClose={() => {
            setModalOpen(false)
            setEditTaskId(null)
            setCreateDate(null)
          }}
        />
      )}
    </div>
  )
}
