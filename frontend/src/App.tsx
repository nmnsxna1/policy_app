import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './store/auth'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewApplication from './pages/NewApplication'
import MyApplications from './pages/MyApplications'
import ApplicationDetailPage from './pages/ApplicationDetailPage'
import PendingReviews from './pages/PendingReviews'
import EscalatedCases from './pages/EscalatedCases'
import Search from './pages/Search'
import ErrorBoundary from './components/ErrorBoundary'

const queryClient = new QueryClient()

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, auth } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && auth && !roles.includes(auth.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="new-application"
          element={
            <ProtectedRoute roles={['APPLICANT']}>
              <NewApplication />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-applications"
          element={
            <ProtectedRoute roles={['APPLICANT']}>
              <MyApplications />
            </ProtectedRoute>
          }
        />
        <Route
          path="pending-reviews"
          element={
            <ProtectedRoute roles={['POLICY_MANAGER']}>
              <PendingReviews />
            </ProtectedRoute>
          }
        />
        <Route
          path="escalated-cases"
          element={
            <ProtectedRoute roles={['SENIOR_MANAGER']}>
              <EscalatedCases />
            </ProtectedRoute>
          }
        />
        <Route
          path="search"
          element={
            <ProtectedRoute roles={['POLICY_MANAGER', 'SENIOR_MANAGER']}>
              <Search />
            </ProtectedRoute>
          }
        />
        <Route path="application/:id" element={<ApplicationDetailPage />} />
      </Route>
      </Routes>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
