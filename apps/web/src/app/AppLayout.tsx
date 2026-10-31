import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '@/app/AuthProvider'
import { useTheme } from '@/app/ThemeContext'
import { useNotificationCount } from '@/features/notifications/hooks'
import { QuickAddDialog } from '@/features/tasks/QuickAddDialog'
import { getStoredAvatar } from '@/features/inspiration/storage'
import {
  Calendar, BookOpen, CheckSquare, GraduationCap, Timer,
  Bell, LayoutDashboard, Settings, LogOut, Plus, Menu, X, Brain, Sun, Moon
} from 'lucide-react'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/today', label: 'Today', icon: Calendar },
  { to: '/planner', label: 'Planner', icon: BookOpen },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/courses', label: 'Courses', icon: GraduationCap },
  { to: '/focus', label: 'Focus', icon: Timer },
  { to: '/notifications', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const { user, profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { data: unreadCount } = useNotificationCount()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Listen for avatar updates
  useEffect(() => {
    getStoredAvatar().then(setAvatarUrl)
    function onAvatarUpdate(e: Event) {
      const customEvt = e as CustomEvent<string | null>
      setAvatarUrl(customEvt.detail)
    }
    window.addEventListener('mindtrack:avatar-updated', onAvatarUpdate)
    return () => window.removeEventListener('mindtrack:avatar-updated', onAvatarUpdate)
  }, [])

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
          <Link to="/dashboard" className="sidebar-logo" onClick={() => setSidebarOpen(false)}>
            <div className="sidebar-logo-icon-wrap">
              <Brain size={20} className="sidebar-logo-icon" />
            </div>
            <div className="sidebar-logo-meta">
              <span className="sidebar-logo-title">MindTrack</span>
              <span className="sidebar-logo-subtitle">Study Workspace</span>
            </div>
          </Link>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Navigation</div>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {({ isActive }) => (
                <>
                  {isActive && <div className="nav-item-active-indicator" />}
                  <span className="nav-item-icon-wrap">
                    <Icon size={18} />
                  </span>
                  <span className="nav-item-text">{label}</span>
                  {label === 'Alerts' && unreadCount && unreadCount > 0 ? (
                    <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-row">
            <Link to="/settings" className="sidebar-user" title="Account & Settings">
              <div className="sidebar-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="sidebar-avatar-img" />
                ) : (
                  (profile?.name ?? user?.email ?? 'U')[0].toUpperCase()
                )}
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
          <Link to="/dashboard" className="topbar-brand">
            <div className="sidebar-logo-icon-wrap sidebar-logo-icon-wrap--sm">
              <Brain size={16} className="sidebar-logo-icon" />
            </div>
            <span>MindTrack</span>
          </Link>
          <div className="topbar-actions">
            <button
              type="button"
              className="topbar-theme-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NavLink
              to="/notifications"
              className="topbar-notif-btn"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            >
              <Bell size={18} />
              {unreadCount && unreadCount > 0 ? (
                <span className="topbar-badge" aria-hidden="true">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
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
