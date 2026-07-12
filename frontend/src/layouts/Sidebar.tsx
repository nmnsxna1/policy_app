import { NavLink } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { cn } from '../lib/utils'

const navItems = {
  APPLICANT: [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/new-application', label: 'New Application', icon: '➕' },
    { to: '/my-applications', label: 'My Applications', icon: '📋' },
  ],
  POLICY_MANAGER: [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/pending-reviews', label: 'Pending Reviews', icon: '⏳' },
    { to: '/search', label: 'Smart Search', icon: '🔍' },
    { to: '/analytics', label: 'Analytics', icon: '📈' },
  ],
  SENIOR_MANAGER: [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/escalated-cases', label: 'Escalated Cases', icon: '🚨' },
    { to: '/search', label: 'Smart Search', icon: '🔍' },
    { to: '/analytics', label: 'Analytics', icon: '📈' },
  ],
}

export default function Sidebar() {
  const { auth } = useAuth()
  const items = navItems[auth?.role as keyof typeof navItems] || navItems.APPLICANT

  return (
    <aside className="w-64 bg-[var(--bg-card)] border-r border-[var(--border)] min-h-screen p-4 flex flex-col">
      <div className="mb-8 px-3">
        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">PolicyPilotAI</div>
        <div className="text-[10px] text-[var(--text-secondary)]">by Sxna Technologies</div>
      </div>
      <nav className="flex-1 space-y-1">
        {items.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]',
              )
            }
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
