import { useState } from 'react'
import { useTasks, useCompleteTask, useDeleteTask } from './hooks'
import { useCourses } from '@/features/courses/hooks'
import { useAuth } from '@/app/AuthProvider'
import { formatDueDate } from '@/lib/dateUtils'
import { Plus, Search, Filter, CheckCircle, Trash2, Edit2, AlertTriangle } from 'lucide-react'
import { TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '@mindtrack/shared'
import { TaskFormModal } from './TaskFormModal'
import { isPast, parseISO } from 'date-fns'

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

export function TasksPage() {
  const { profile } = useAuth()
  const tz = profile?.timezone ?? 'Asia/Manila'
  const [statusFilter, setStatusFilter] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: tasks, isLoading, error } = useTasks({
    status: statusFilter || undefined,
    course_id: courseFilter || undefined,
    type: typeFilter || undefined,
  })
  const { data: courses } = useCourses()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()

  const filtered = tasks?.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <button id="create-task-btn" className="btn btn--primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            id="tasks-search"
            type="search"
            className="search-input"
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="status-tabs" role="tablist" aria-label="Task status filter">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={statusFilter === tab.value}
              className={`status-tab ${statusFilter === tab.value ? 'status-tab--active' : ''}`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="filter-selects">
          <select
            id="tasks-course-filter"
            className="form-select form-select--sm"
            value={courseFilter}
            onChange={e => setCourseFilter(e.target.value)}
          >
            <option value="">All courses</option>
            {courses?.map(c => <option key={c.id} value={c.id}>{c.code || c.name}</option>)}
          </select>

          <select
            id="tasks-type-filter"
            className="form-select form-select--sm"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="page-loading"><div className="spinner" /><p>Loading tasks…</p></div>
      ) : error ? (
        <div className="page-error"><AlertTriangle size={24} /><p>Failed to load tasks</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state empty-state--center">
          <CheckCircle size={48} className="empty-icon" />
          <p className="empty-title">{search ? 'No tasks match your search' : 'No tasks yet'}</p>
          <p className="empty-text">Press the + button or <kbd>Q</kbd> to add your first task</p>
          <button className="btn btn--primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Add task
          </button>
        </div>
      ) : (
        <div className="task-table">
          {filtered.map(t => {
            const isOverdue = t.due_at && isPast(parseISO(t.due_at)) && t.status !== 'done'
            return (
              <div key={t.id} className={`task-row ${t.status === 'done' ? 'task-row--done' : ''} ${isOverdue ? 'task-row--overdue' : ''}`}>
                <button
                  className="task-check"
                  onClick={() => t.status !== 'done' && completeTask.mutate(t.id)}
                  aria-label={`Mark ${t.title} as done`}
                  disabled={t.status === 'done'}
                >
                  <CheckCircle size={18} />
                </button>

                <div className="task-row-body" onClick={() => setEditId(t.id)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && setEditId(t.id)}>
                  <div className="task-row-title">
                    <span className="task-title">{t.title}</span>
                    <span className={`priority-dot priority-dot--${t.priority}`} title={TASK_PRIORITY_LABELS[t.priority]} />
                  </div>
                  <div className="task-row-meta">
                    {(t as any).course && (
                      <span className="task-course-chip" style={{ background: `${(t as any).course.color}22`, color: (t as any).course.color }}>
                        {(t as any).course.code || (t as any).course.name}
                      </span>
                    )}
                    <span className="task-type-pill">{TASK_TYPE_LABELS[t.type]}</span>
                    {t.due_at && (
                      <span className={`task-due-chip ${isOverdue ? 'task-due-chip--overdue' : ''}`}>
                        {formatDueDate(t.due_at, tz)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="task-row-actions">
                  <button className="icon-btn" onClick={() => setEditId(t.id)} aria-label={`Edit ${t.title}`}>
                    <Edit2 size={15} />
                  </button>
                  <button
                    className="icon-btn icon-btn--danger"
                    onClick={() => { if (confirm('Delete this task?')) deleteTask.mutate(t.id) }}
                    aria-label={`Delete ${t.title}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(createOpen || editId) && (
        <TaskFormModal
          taskId={editId ?? undefined}
          onClose={() => { setCreateOpen(false); setEditId(null) }}
        />
      )}
    </div>
  )
}
