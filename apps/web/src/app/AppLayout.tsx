import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '@/app/AuthProvider'
import { useNotificationCount } from '@/features/notifications/hooks'
import { QuickAddDialog } from '@/features/tasks/QuickAddDialog'
import {
  Calendar, BookOpen, CheckSquare, GraduationCap, Timer,
  Bell, BarChart2, Settings, LogOut, Plus, Menu, X, Brain
} from 'lucide-react'

const NAV = [
  { to: '/', label: 'Today', icon: Calendar, end: true },
  { to: '/planner', label: 'Planner', icon: BookOpen },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/courses', label: 'Courses', icon: GraduationCap },
  { to: '/focus', label: 'Focus', icon: Timer },
  { to: '/notifications', label: 'Alerts', icon: Bell },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart2 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { data: unreadCount } = useNotificationCount()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  // Global keyboard shortcut Q for quick-add
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'q' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const active = document.activeElement
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.tagName === 'SELECT') return
        setQuickAddOpen(true)
      }
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Brain size={24} className="sidebar-logo-icon" />
            <span>MindTrack</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Alerts' && unreadCount && unreadCount > 0 ? (
                <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link to="/settings" className="sidebar-user" title="Account & Settings">
            <div className="sidebar-avatar">
              {(profile?.name ?? user?.email ?? 'U')[0].toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{profile?.name ?? 'Student'}</p>
              <p className="sidebar-user-email">{user?.email}</p>
            </div>
          </Link>
          <button className="sidebar-signout" onClick={handleSignOut} aria-label="Sign out" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="main-area">
        {/* Top bar */}
        <header className="topbar">
          <button
            className="topbar-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
          >
            <Menu size={20} />
          </button>
          <div className="topbar-brand">
            <Brain size={20} className="sidebar-logo-icon" />
            <span>MindTrack</span>
          </div>
          <div className="topbar-actions">
            <NavLink to="/notifications" className="topbar-notif-btn" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
              <Bell size={18} />
              {unreadCount && unreadCount > 0 ? <span className="topbar-badge">{unreadCount}</span> : null}
            </NavLink>
            <button
              id="quick-add-btn"
              className="btn btn--primary btn--sm"
              onClick={() => setQuickAddOpen(true)}
              aria-label="Quick add task (Q)"
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content" id="main-content">
          <Outlet />
        </main>
      </div>

      {quickAddOpen && <QuickAddDialog onClose={() => setQuickAddOpen(false)} />}
    </div>
  )
}
