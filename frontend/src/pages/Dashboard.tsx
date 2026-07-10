import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../store/auth'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import type { DashboardData } from '../types'

function StatCard({ icon, label, value, color, href, navigate: nav }: { icon: React.ReactNode; label: string; value: number; color: string; href?: string; navigate: (path: string) => void }) {
  return (
    <button
      onClick={() => href && nav(href)}
      className={`relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-left transition-all hover:shadow-md ${href ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-bold mb-1">{value}</div>
          <div className="text-xs text-[var(--text-secondary)]">{label}</div>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      {href && (
        <div className="mt-3 text-[10px] text-blue-600 font-medium flex items-center gap-1">
          View all
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 12.75 3 3m0 0 3-3m-3 3v-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
      )}
    </button>
  )
}

export default function Dashboard() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const role = auth?.role

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/applications/dashboard')
      return res.data
    },
    refetchInterval: 10000,
  })

  if (isLoading) return <div className="p-6 text-[var(--text-secondary)]">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PolicyPilotAI <span className="text-base font-normal text-[var(--text-secondary)]">— Dashboard</span></h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Welcome back, {auth?.username}
        </p>
      </div>

      {/* Applicant Dashboard */}
      {role === 'APPLICANT' && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard navigate={navigate}
              icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>}
              label="In Queue"
              value={data.draft_count ?? 0}
              color="bg-blue-100 dark:bg-blue-900/30"
              href="/my-applications"
            />
            <StatCard navigate={navigate}
              icon={<svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
              label="In Review"
              value={data.in_review_count ?? 0}
              color="bg-orange-100 dark:bg-orange-900/30"
              href="/my-applications"
            />
            <StatCard navigate={navigate}
              icon={<svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>}
              label="Flagged"
              value={data.flagged_count ?? 0}
              color="bg-red-100 dark:bg-red-900/30"
              href="/my-applications"
            />
            <StatCard navigate={navigate}
              icon={<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
              label="Approved"
              value={data.approved_count ?? 0}
              color="bg-green-100 dark:bg-green-900/30"
              href="/my-applications"
            />
            <StatCard navigate={navigate}
              icon={<svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>}
              label="Rejected"
              value={data.rejected_count ?? 0}
              color="bg-gray-100 dark:bg-gray-800"
              href="/my-applications"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={() => navigate('/new-application')} className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Application
            </Button>
            <Button onClick={() => navigate('/my-applications')} variant="outline" className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              View All Applications
            </Button>
          </div>

          {data.applications && data.applications.length > 0 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h2 className="text-base font-semibold">Recent Applications</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.applications.slice(0, 5).map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.application_number}</TableCell>
                      <TableCell><StatusBadge status={app.status} /></TableCell>
                      <TableCell className="text-[var(--text-secondary)]">{new Date(app.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/application/${app.id}`)}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Policy Manager Dashboard */}
      {role === 'POLICY_MANAGER' && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard navigate={navigate}
              icon={<svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
              label="Pending Review"
              value={data.pending_count}
              color="bg-orange-100 dark:bg-orange-900/30"
              href="/pending-reviews"
            />
            <StatCard navigate={navigate}
              icon={<svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>}
              label="Escalated"
              value={data.escalated_count ?? 0}
              color="bg-red-100 dark:bg-red-900/30"
              href="/escalated-cases"
            />
            <StatCard navigate={navigate}
              icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>}
              label="Total Applications"
              value={(data.pending_count + (data.escalated_count ?? 0))}
              color="bg-blue-100 dark:bg-blue-900/30"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.pending_applications && data.pending_applications.length > 0 && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border)] bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Pending Reviews
                  </h2>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {data.pending_applications.slice(0, 5).map((app) => (
                    <div key={app.id} className="px-5 py-3 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors">
                      <div>
                        <div className="text-sm font-medium">{app.application_number}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{new Date(app.created_at).toLocaleDateString()}</div>
                      </div>
                      <Button size="sm" onClick={() => navigate(`/application/${app.id}`)}>Review</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.escalated_applications && data.escalated_applications.length > 0 && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border)] bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Escalated Cases
                  </h2>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {data.escalated_applications.slice(0, 5).map((app) => (
                    <div key={app.id} className="px-5 py-3 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors">
                      <div>
                        <div className="text-sm font-medium">{app.application_number}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{new Date(app.created_at).toLocaleDateString()}</div>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {(!data.pending_applications || data.pending_applications.length === 0) && (!data.escalated_applications || data.escalated_applications.length === 0) && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 text-center">
              <div className="text-2xl mb-2">✓</div>
              <p className="text-sm text-[var(--text-secondary)]">No pending items. All applications are up to date.</p>
            </div>
          )}
        </>
      )}

      {/* Senior Manager Dashboard */}
      {role === 'SENIOR_MANAGER' && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard navigate={navigate}
              icon={<svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>}
              label="Escalated Cases"
              value={data.pending_count}
              color="bg-red-100 dark:bg-red-900/30"
              href="/escalated-cases"
            />
            <StatCard navigate={navigate}
              icon={<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
              label="Total Processed"
              value={data.total_count ?? 0}
              color="bg-green-100 dark:bg-green-900/30"
            />
            <StatCard navigate={navigate}
              icon={<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>}
              label="Pending Actions"
              value={data.pending_count}
              color="bg-purple-100 dark:bg-purple-900/30"
              href="/escalated-cases"
            />
          </div>

          {data.escalated_applications && data.escalated_applications.length > 0 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)] bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Escalated Applications
                </h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.escalated_applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.application_number}</TableCell>
                      <TableCell><StatusBadge status={app.status} /></TableCell>
                      <TableCell className="text-[var(--text-secondary)]">{new Date(app.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="destructive" onClick={() => navigate(`/application/${app.id}`)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {(!data.escalated_applications || data.escalated_applications.length === 0) && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 text-center">
              <div className="text-2xl mb-2">✓</div>
              <p className="text-sm text-[var(--text-secondary)]">No escalated cases. Everything is resolved.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}