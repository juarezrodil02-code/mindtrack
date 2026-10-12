import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Zap, ChevronDown } from 'lucide-react'
import { QuickAddTaskSchema, type QuickAddTask, TASK_TYPE_LABELS, type TaskType } from '@mindtrack/shared'
import { useCreateTask } from './hooks'
import { useCourses } from '@/features/courses/hooks'
import { useAuth } from '@/app/AuthProvider'
import { format, addDays } from 'date-fns'

interface Props {
  onClose: () => void
}

export function QuickAddDialog({ onClose }: Props) {
  const { data: courses } = useCourses()
  const createTask = useCreateTask()
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Default due date = today 23:59
  const defaultDue = `${format(new Date(), "yyyy-MM-dd")}T23:59`

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<QuickAddTask>({
    resolver: zodResolver(QuickAddTaskSchema),
    defaultValues: {
      type: 'assignment',
      course_id: '',
      due_at: defaultDue,
    },
  })

  // Focus title on open, trap focus, close on Escape
  useEffect(() => {
    titleRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function onSubmit(values: QuickAddTask) {
    setServerError(null)
    try {
      const dueAt = values.due_at && values.due_at.trim() !== ''
        ? new Date(values.due_at).toISOString()
        : null
      const courseId = values.course_id && values.course_id.trim() !== ''
        ? values.course_id
        : null

      await createTask.mutateAsync({
        title: values.title,
        type: values.type,
        course_id: courseId,
        due_at: dueAt,
        status: 'todo',
        priority: 'medium',
      })
      setSuccess(true)
      setTimeout(() => {
        reset()
        setSuccess(false)
        onClose()
      }, 500)
    } catch (err: any) {
      console.error('Failed to create task:', err)
      setServerError(err?.message || 'Failed to save task. Please try again.')
    }
  }

  const { ref: titleReg, ...titleRegRest } = register('title')

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label="Quick add task">
      <div className="dialog quick-add-dialog" ref={dialogRef}>
        <div className="dialog-header">
          <div className="dialog-title">
            <Zap size={18} className="dialog-title-icon" />
            Quick Add Task
          </div>
          <button className="dialog-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="quick-add-form" noValidate>
          <div className="form-group">
            <input
              id="qa-title"
              type="text"
              className={`form-input form-input--lg ${errors.title ? 'form-input--error' : ''}`}
              placeholder="What do you need to do?"
              autoComplete="off"
              {...titleRegRest}
              ref={(el) => {
                titleReg(el)
                titleRef.current = el
              }}
            />
            {errors.title && <p className="form-error">{errors.title.message}</p>}
          </div>

          <div className="quick-add-row">
            <div className="form-group form-group--flex">
              <label htmlFor="qa-course" className="form-label">Course</label>
              <select id="qa-course" className="form-select" {...register('course_id')}>
                <option value="">No course</option>
                {courses?.map(c => (
                  <option key={c.id} value={c.id}>{c.code || c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group form-group--flex">
              <label htmlFor="qa-type" className="form-label">Type</label>
              <select id="qa-type" className="form-select" {...register('type')}>
                {(Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div className="form-group form-group--flex">
              <label htmlFor="qa-due" className="form-label">Due</label>
              <input
                id="qa-due"
                type="datetime-local"
                className="form-input"
                defaultValue={defaultDue}
                {...register('due_at')}
              />
            </div>
          </div>

          {serverError && (
            <div className="form-error" style={{ marginBottom: '0.75rem', color: '#f87171', fontSize: '0.875rem' }}>
              {serverError}
            </div>
          )}

          <div className="quick-add-footer">
            <p className="quick-add-hint">Press Enter to save • Esc to cancel</p>
            <button
              id="qa-submit"
              type="submit"
              className={`btn btn--primary ${success ? 'btn--success' : ''}`}
              disabled={isSubmitting || success}
            >
              {success ? '✓ Added!' : isSubmitting ? 'Adding…' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
