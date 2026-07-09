import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import NotificationBell from '../components/NotificationBell'
import { useAuth } from '../store/auth'
import { useDarkMode } from '../hooks/useDarkMode'

export default function AppLayout() {
  const { auth, logout } = useAuth()
  const navigate = useNavigate()
  const { isDark, toggle: toggleDark } = useDarkMode()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-secondary)]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center justify-end px-6 gap-2 shrink-0">
          {auth?.role === 'APPLICANT' && <NotificationBell />}
          <button
            onClick={toggleDark}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 rounded hover:bg-[var(--bg-secondary)]"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <span className="text-sm text-[var(--text-secondary)]">
            {auth?.username}
            <span className="ml-1.5 text-xs opacity-60">
              ({auth?.role?.replace('_', ' ').toLowerCase()})
            </span>
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-700 hover:underline transition-colors"
          >
            Logout
          </button>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
