import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/app/AuthProvider'
import { AppLayout } from '@/app/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { TodayPage } from '@/features/today/TodayPage'
import { PlannerPage } from '@/features/planner/PlannerPage'
import { TasksPage } from '@/features/tasks/TasksPage'
import { CoursesPage } from '@/features/courses/CoursesPage'
import { FocusPage } from '@/features/focus/FocusPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="app-loading"><div className="spinner" /></div>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="app-loading"><div className="spinner" /></div>
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<TodayPage />} />
              <Route path="today" element={<TodayPage />} />
              <Route path="planner" element={<PlannerPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="courses" element={<CoursesPage />} />
              <Route path="focus" element={<FocusPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
