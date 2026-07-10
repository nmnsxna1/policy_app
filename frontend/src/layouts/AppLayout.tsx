import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import NotificationBell from '../components/NotificationBell'
import { useAuth } from '../store/auth'
import { useDarkMode } from '../hooks/useDarkMode'
import { useState } from 'react'

export default function AppLayout() {
  const { auth, logout } = useAuth()
  const navigate = useNavigate()
  const { isDark, toggle: toggleDark } = useDarkMode()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-secondary)]">
      {/* Sidebar with toggle button */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden`}>
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            {auth?.role !== 'APPLICANT' && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
                title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  )}
                </svg>
              </button>
            )}
            <span className="text-sm font-semibold text-blue-600 hidden sm:block">PolicyPilotAI</span>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
