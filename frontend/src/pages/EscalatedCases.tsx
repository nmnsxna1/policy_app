import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import type { DashboardData } from '../types'

export default function EscalatedCases() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['escalated-cases'],
    queryFn: async () => {
      const res = await api.get('/applications/dashboard')
      return res.data
    },
    refetchInterval: 10000,
  })

  if (isLoading) return <div className="p-6 text-[var(--text-secondary)]">Loading...</div>

  const apps = data?.escalated_applications || []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Escalated Cases</h1>

      {apps.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
          No escalated cases.
        </div>
      ) : (
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
            {apps.map((app) => (
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
      )}
    </div>
  )
}
