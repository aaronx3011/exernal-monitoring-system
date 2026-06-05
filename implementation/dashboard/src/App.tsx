import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import FleetOverview from '@/pages/FleetOverview'
import RegisterApp from '@/pages/RegisterApp'
import AppDetail from '@/pages/AppDetail'
import TestsPage from '@/pages/TestsPage'
import TestDetail from '@/pages/TestDetail'
import AlertsPage from '@/pages/AlertsPage'
import SettingsPage from '@/pages/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth()
  if (!token || !user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FleetOverview />} />
        <Route path="register" element={<RegisterApp />} />
        <Route path="apps/:id" element={<AppDetail />} />
        <Route path="tests" element={<TestsPage />} />
        <Route path="tests/:id" element={<TestDetail />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const { checkAuth, initializing } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    const handleLogout = () => navigate('/login')
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [navigate])

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <AppRoutes />
}
