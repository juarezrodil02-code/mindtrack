import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { TaskCreateSchema, type TaskCreate, TASK_TYPE_LABELS, type TaskType } from '@mindtrack/shared'
import { useCreateTask, useUpdateTask } from './hooks'
import { useCourses } from '@/features/courses/hooks'
import { useQuery } from '@tanstack/react-query'
import { fetchTask } from '@/lib/api'
import { format } from 'date-fns'

interface Props {
  taskId?: string
  initialDueDate?: Date | string
  onClose: () => void
}

export function TaskFormModal({ taskId, initialDueDate, onClose }: Props) {
  const { data: courses } = useCourses()
  const { data: existing } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => fetchTask(taskId!),
    enabled: !!taskId,
  })
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TaskCreate>({
    resolver: zodResolver(TaskCreateSchema),
    defaultValues: {
      type: 'assignment',
      priority: 'medium',
      status: 'todo',
      due_at: initialDueDate ? format(new Date(initialDueDate), "yyyy-MM-dd'T'12:00") : undefined,
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        notes: existing.notes ?? undefined,
        type: existing.type,
        priority: existing.priority,
        due_at: existing.due_at ? format(new Date(existing.due_at), "yyyy-MM-dd'T'HH:mm") : undefined,
        estimated_minutes: existing.estimated_minutes ?? undefined,
        course_id: existing.course_id ?? undefined,
        status: existing.status,
      })
    } else if (initialDueDate) {
      reset({
        title: '',
        type: 'assignment',
        priority: 'medium',
        status: 'todo',
        due_at: format(new Date(initialDueDate), "yyyy-MM-dd'T'12:00"),
      })
    }
  }, [existing, initialDueDate, reset])

  async function onSubmit(values: TaskCreate) {
    setServerError(null)
    try {
      const dueAt = values.due_at && values.due_at.trim() !== ''
        ? new Date(values.due_at).toISOString()
        : null
      const courseId = values.course_id && values.course_id.trim() !== ''
        ? values.course_id
        : null
      const estMinutes = values.estimated_minutes && !Number.isNaN(values.estimated_minutes)
        ? values.estimated_minutes
        : null

      const payload = {
        ...values,
        due_at: dueAt,
        course_id: courseId,
        estimated_minutes: estMinutes,
        notes: values.notes || null,
      }
      if (taskId) {
        await updateTask.mutateAsync({ id: taskId, ...payload })
      } else {
        await createTask.mutateAsync(payload)
      }
      onClose()
    } catch (err: any) {
      console.error('Failed to save task:', err)
      setServerError(err?.message || 'Failed to save task. Please try again.')
    }
  }

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={taskId ? 'Edit task' : 'Create task'}>
      <div className="dialog task-dialog">
        <div className="dialog-header">
          <h2 className="dialog-title">{taskId ? 'Edit Task' : 'New Task'}</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="task-form" noValidate>
          <div className="form-group">
            <label htmlFor="tf-title" className="form-label">Title *</label>
            <input id="tf-title" type="text" className={`form-input ${errors.title ? 'form-input--error' : ''}`}
              placeholder="Task title" {...register('title')} autoFocus />
            {errors.title && <p className="form-error">{errors.title.message}</p>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tf-course" className="form-label">Course</label>
              <select id="tf-course" className="form-select" {...register('course_id')}>
                <option value="">None</option>
                {courses?.map(c => <option key={c.id} value={c.id}>{c.code ? `${c.code} – ${c.name}` : c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="tf-type" className="form-label">Type</label>
              <select id="tf-type" className="form-select" {...register('type')}>
                {(Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tf-priority" className="form-label">Priority</label>
              <select id="tf-priority" className="form-select" {...register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="tf-status" className="form-label">Status</label>
              <select id="tf-status" className="form-select" {...register('status')}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tf-due" className="form-label">Due date & time</label>
              <input id="tf-due" type="datetime-local" className="form-input" {...register('due_at')} />
            </div>
            <div className="form-group">
              <label htmlFor="tf-est" className="form-label">Est. minutes</label>
              <input id="tf-est" type="number" min={1} className="form-input"
                placeholder="e.g. 60" {...register('estimated_minutes', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tf-notes" className="form-label">Notes</label>
            <textarea id="tf-notes" className="form-textarea" rows={3}
              placeholder="Optional notes…" {...register('notes')} />
          </div>

          {serverError && (
            <div className="form-error" style={{ marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>
              {serverError}
            </div>
          )}

          <div className="dialog-footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button id="tf-submit" type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : taskId ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
