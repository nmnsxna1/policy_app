import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import type { DashboardData } from '../types'

export default function MyApplications() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['my-applications'],
    queryFn: async () => {
      const res = await api.get('/applications/dashboard')
      return res.data
    },
  })

  if (isLoading) return <div className="p-6 text-[var(--text-secondary)]">Loading...</div>

  const apps = data?.applications || []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Applications</h1>

      {apps.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
          No applications found. Start by creating a new application.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((app) => (
              <TableRow key={app.id}>
                <TableCell className="font-medium">{app.application_number}</TableCell>
                <TableCell><StatusBadge status={app.status} /></TableCell>
                <TableCell className="text-[var(--text-secondary)]">{new Date(app.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-[var(--text-secondary)]">{new Date(app.updated_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/application/${app.id}`)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
