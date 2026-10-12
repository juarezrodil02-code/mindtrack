import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getDashboardSummary } from '@/lib/api'
import { useTasks } from '@/features/tasks/hooks'
import { useAuth } from '@/app/AuthProvider'
import { formatDueDate } from '@/lib/dateUtils'
import { Flame, CheckCircle2, Clock, BookOpen, TrendingUp, ArrowUpRight } from 'lucide-react'

export function DashboardPage() {
  const { profile } = useAuth()
  const tz = profile?.timezone ?? 'Asia/Manila'

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardSummary,
    refetchInterval: 5 * 60_000,
  })

  const { data: tasks } = useTasks()
  const upcoming = tasks?.filter(t => t.status !== 'done' && t.due_at).slice(0, 5) ?? []
  const doneThisWeek = (summary as any)?.tasks_completed_this_week ?? 0
  const focusMins = (summary as any)?.focus_minutes_this_week ?? 0
  const streak = (summary as any)?.current_streak ?? 0

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your study overview</p>
        </div>
      </div>

      {isLoading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : (
        <div className="dashboard-grid">
          {/* Interactive Stat cards */}
          <Link to="/today" className="stat-card stat-card--interactive stat-card--streak" title="View Today's Agenda">
            <div className="stat-card-header">
              <div className="stat-icon"><Flame size={22} /></div>
              <ArrowUpRight size={16} className="stat-arrow" />
            </div>
            <div className="stat-value">{streak}</div>
            <div className="stat-label">Day streak 🔥</div>
            <span className="stat-action-hint">View today's agenda</span>
          </Link>

          <Link to="/tasks" className="stat-card stat-card--interactive stat-card--tasks" title="View All Tasks">
            <div className="stat-card-header">
              <div className="stat-icon"><CheckCircle2 size={22} /></div>
              <ArrowUpRight size={16} className="stat-arrow" />
            </div>
            <div className="stat-value">{doneThisWeek}</div>
            <div className="stat-label">Tasks done this week</div>
            <span className="stat-action-hint">Manage tasks</span>
          </Link>

          <Link to="/focus" className="stat-card stat-card--interactive stat-card--focus" title="Start Focus Session">
            <div className="stat-card-header">
              <div className="stat-icon"><Clock size={22} /></div>
              <ArrowUpRight size={16} className="stat-arrow" />
            </div>
            <div className="stat-value">{Math.round(focusMins / 60 * 10) / 10}h</div>
            <div className="stat-label">Focus time this week</div>
            <span className="stat-action-hint">Start focus timer</span>
          </Link>

          <Link to="/planner" className="stat-card stat-card--interactive stat-card--upcoming" title="View Week Planner">
            <div className="stat-card-header">
              <div className="stat-icon"><BookOpen size={22} /></div>
              <ArrowUpRight size={16} className="stat-arrow" />
            </div>
            <div className="stat-value">{upcoming.length}</div>
            <div className="stat-label">Upcoming deadlines</div>
            <span className="stat-action-hint">Open planner</span>
          </Link>

          {/* Upcoming deadlines */}
          <div className="dashboard-section">
            <h2 className="section-title"><TrendingUp size={16} /> Upcoming Deadlines</h2>
            {upcoming.length === 0 ? (
              <div className="empty-state">
                <CheckCircle2 size={32} className="empty-icon" />
                <p className="empty-text">No upcoming deadlines</p>
              </div>
            ) : (
              <div className="deadline-list">
                {upcoming.map(t => (
                  <Link to="/tasks" key={t.id} className="deadline-item" title="View in Tasks">
                    <div className="deadline-info">
                      <span className="task-title">{t.title}</span>
                      {(t as any).course && (
                        <span className="task-course-chip" style={{ color: (t as any).course.color }}>
                          {(t as any).course.code || (t as any).course.name}
                        </span>
                      )}
                    </div>
                    <span className="deadline-due">{t.due_at ? formatDueDate(t.due_at, tz) : '—'}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
