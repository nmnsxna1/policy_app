import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import type { Application } from '../types'

export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const { data, isLoading, refetch } = useQuery<Application[]>({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query.trim()) return []
      const res = await api.get(`/applications/search/${query.trim()}`)
      return res.data
    },
    enabled: false,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) refetch()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search Applications</h1>

      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by application number (e.g. LN-202507-...)"
          className="flex-1 h-9 px-3 text-sm border border-[var(--border)] rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </form>

      {data && data.length === 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
          No applications found for "{query}"
        </div>
      )}

      {data && data.length > 0 && (
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
            {data.map((app) => (
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
      )}
    </div>
  )
}
