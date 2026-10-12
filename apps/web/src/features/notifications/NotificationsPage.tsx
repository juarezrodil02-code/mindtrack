import {
  useNotifications, useMarkRead, useMarkAllRead,
  useSnoozeReminder, useDismissReminder, useSyncNotifications,
} from './hooks'
import { Bell, BellOff, Clock, CheckCheck, ChevronDown, RefreshCw, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { SNOOZE_OPTIONS } from '@mindtrack/shared'
import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'

export function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const snooze = useSnoozeReminder()
  const dismiss = useDismissReminder()
  const syncNotifs = useSyncNotifications()
  const [snoozeOpen, setSnoozeOpen] = useState<string | null>(null)

  const unread = notifications?.filter(n => !n.read_at) ?? []
  const read = notifications?.filter(n => !!n.read_at) ?? []

  const overdueCount = unread.filter(n => n.title?.startsWith('🚨')).length
  const dueTodayCount = unread.filter(n => n.title?.startsWith('⏰')).length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alerts</h1>
          {unread.length > 0 && (
            <p className="page-subtitle">
              {overdueCount > 0 && (
                <span style={{ color: 'var(--red)', fontWeight: 700, marginRight: '10px' }}>
                  🚨 {overdueCount} overdue
                </span>
              )}
              {dueTodayCount > 0 && (
                <span style={{ color: 'var(--amber)', fontWeight: 600, marginRight: '10px' }}>
                  ⏰ {dueTodayCount} due today
                </span>
              )}
              {unread.length - overdueCount - dueTodayCount > 0 && (
                <span style={{ color: 'var(--text-2)' }}>
                  +{unread.length - overdueCount - dueTodayCount} more
                </span>
              )}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            id="refresh-alerts-btn"
            className="btn btn--ghost btn--sm"
            onClick={() => syncNotifs.mutate()}
            disabled={syncNotifs.isPending}
            title="Refresh alerts for any newly due tasks"
          >
            <RefreshCw size={15} className={syncNotifs.isPending ? 'spin' : ''} />
            {syncNotifs.isPending ? 'Syncing…' : 'Refresh'}
          </button>
          {unread.length > 0 && (
            <button
              id="mark-all-read-btn"
              className="btn btn--ghost btn--sm"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : !notifications?.length ? (
        <div className="empty-state empty-state--center">
          <BellOff size={52} className="empty-icon" />
          <p className="empty-title">No alerts yet</p>
          <p className="empty-text">
            Alerts will appear here when tasks are overdue or due within 24 hours.
            Click <strong>Refresh</strong> to check now.
          </p>
          <button
            className="btn btn--outline"
            style={{ marginTop: '12px' }}
            onClick={() => syncNotifs.mutate()}
            disabled={syncNotifs.isPending}
          >
            <RefreshCw size={15} /> Check for due tasks
          </button>
          <Link to="/tasks" className="btn btn--ghost btn--sm" style={{ marginTop: '8px' }}>
            View all tasks
          </Link>
        </div>
      ) : (
        <div className="notif-page-list">
          {unread.length > 0 && (
            <section>
              <div className="notif-section-header">
                <h2 className="section-title">
                  <Bell size={15} className="section-icon section-icon--alert" />
                  Active Alerts ({unread.length})
                </h2>
                <Link to="/tasks" className="btn btn--xs btn--outline">
                  View all tasks →
                </Link>
              </div>

              {/* Overdue banner if any */}
              {overdueCount > 0 && (
                <div className="notif-overdue-banner">
                  <AlertTriangle size={18} />
                  <span>
                    You have <strong>{overdueCount} overdue {overdueCount === 1 ? 'task' : 'tasks'}</strong>.
                    Please complete or reschedule them.
                  </span>
                  <Link to="/tasks" className="btn btn--xs btn--danger">View tasks</Link>
                </div>
              )}

              <div className="notif-page-items">
                {unread.map(n => (
                  <NotifItem
                    key={n.id}
                    notification={n}
                    snoozeOpen={snoozeOpen}
                    onSnoozeOpen={setSnoozeOpen}
                    onMarkRead={() => markRead.mutate(n.id)}
                    onSnooze={(min) => {
                      if (n.reminder?.id) snooze.mutate({ id: n.reminder.id, minutes: min })
                      markRead.mutate(n.id)
                      setSnoozeOpen(null)
                    }}
                    onDismiss={() => {
                      if (n.reminder?.id) dismiss.mutate(n.reminder.id)
                      markRead.mutate(n.id)
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {read.length > 0 && (
            <section>
              <h2 className="section-title section-title--muted">
                <CheckCircle2 size={14} /> Earlier ({read.length})
              </h2>
              <div className="notif-page-items notif-page-items--read">
                {read.map(n => (
                  <NotifItem
                    key={n.id}
                    notification={n}
                    snoozeOpen={snoozeOpen}
                    onSnoozeOpen={setSnoozeOpen}
                    onMarkRead={() => {}}
                    onSnooze={() => {}}
                    onDismiss={() => { if (n.reminder?.id) dismiss.mutate(n.reminder.id) }}
                    isRead
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function NotifItem({ notification: n, snoozeOpen, onSnoozeOpen, onMarkRead, onSnooze, onDismiss, isRead }: {
  notification: any
  snoozeOpen: string | null
  onSnoozeOpen: (id: string | null) => void
  onMarkRead: () => void
  onSnooze: (minutes: number) => void
  onDismiss: () => void
  isRead?: boolean
}) {
  const isOverdue = n.title?.startsWith('🚨')
  const isDueToday = n.title?.startsWith('⏰')
  const isClassAlert = n.title?.startsWith('🎓')

  let borderColor = 'var(--border)'
  if (isOverdue) borderColor = 'var(--red)'
  else if (isDueToday) borderColor = 'var(--amber)'
  else if (isClassAlert) borderColor = 'var(--indigo)'

  return (
    <div
      className={`notif-page-item${!isRead ? ' notif-page-item--unread' : ''}`}
      style={{ borderLeftColor: borderColor }}
      onClick={() => !isRead && onMarkRead()}
    >
      <div className="notif-page-body">
        <div className="notif-page-header">
          <span className={`notif-page-title${isOverdue ? ' notif-page-title--overdue' : isDueToday ? ' notif-page-title--today' : ''}`}>
            {n.title}
          </span>
          <span className="notif-page-time">
            {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="notif-page-text">{n.body}</p>
        {!isRead && (
          <div className="notif-page-actions" onClick={e => e.stopPropagation()}>
            <div className="snooze-wrapper">
              <button
                className="btn btn--ghost btn--xs"
                onClick={e => { e.stopPropagation(); onSnoozeOpen(snoozeOpen === n.id ? null : n.id) }}
                title="Snooze this alert"
              >
                <Clock size={12} /> Snooze <ChevronDown size={12} />
              </button>
              {snoozeOpen === n.id && (
                <div className="snooze-menu" role="menu">
                  {SNOOZE_OPTIONS.map(opt => (
                    <button key={opt.minutes} className="snooze-option" role="menuitem"
                      onClick={e => { e.stopPropagation(); onSnooze(opt.minutes) }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="btn btn--ghost btn--xs"
              onClick={e => { e.stopPropagation(); onMarkRead() }}
              title="Mark as read"
            >
              <CheckCheck size={12} /> Mark read
            </button>
            <button
              className="btn btn--ghost btn--xs"
              style={{ color: 'var(--text-3)' }}
              onClick={e => { e.stopPropagation(); onDismiss() }}
              title="Dismiss alert"
            >
              <X size={12} /> Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
