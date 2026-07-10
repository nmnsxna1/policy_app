import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import type { Application } from '../types'

interface AdvancedSearchParams {
  query: string
  status: string
  riskLevel: string
  policyType: string
  dateFrom: string
  dateTo: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'UPLOADED', label: 'Uploaded' },
  { value: 'AI_PROCESSED', label: 'AI Processed' },
  { value: 'CORRECTION_REQUIRED', label: 'Correction Required' },
  { value: 'PENDING_PM_REVIEW', label: 'Pending Review' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

const RISK_OPTIONS = [
  { value: '', label: 'Any Risk' },
  { value: 'LOW', label: 'Low Risk' },
  { value: 'MEDIUM', label: 'Medium Risk' },
  { value: 'HIGH', label: 'High Risk' },
]

const POLICY_OPTIONS = [
  { value: '', label: 'Any Type' },
  { value: 'HEALTH', label: 'Health' },
  { value: 'CAR', label: 'Car' },
  { value: 'BIKE', label: 'Bike' },
  { value: 'LIFE', label: 'Life' },
  { value: 'HOME', label: 'Home' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'OTHER', label: 'Other' },
]

export default function SmartSearch() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<AdvancedSearchParams>({
    query: '',
    status: '',
    riskLevel: '',
    policyType: '',
    dateFrom: '',
    dateTo: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [searchKey, setSearchKey] = useState(0)

  const params = useMemo(() => {
    const p = new URLSearchParams()
    if (filters.query.trim()) p.set('query', filters.query.trim())
    if (filters.status) p.set('status', filters.status)
    if (filters.riskLevel) p.set('risk_level', filters.riskLevel)
    if (filters.policyType) p.set('policy_type', filters.policyType)
    if (filters.dateFrom) p.set('date_from', filters.dateFrom)
    if (filters.dateTo) p.set('date_to', filters.dateTo)
    return p.toString()
  }, [filters])

  const queryEnabled = searchKey > 0 && params.length > 0

  const { data, isLoading } = useQuery<Application[]>({
    queryKey: ['advanced-search', searchKey, params],
    queryFn: async () => {
      const res = await api.get(`/applications/advanced-search?${params}`)
      return res.data
    },
    enabled: queryEnabled,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchKey(k => k + 1)
  }

  const clearFilters = () => {
    setFilters({ query: '', status: '', riskLevel: '', policyType: '', dateFrom: '', dateTo: '' })
    setSearchKey(0)
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')
  const searched = searchKey > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PolicyPilotAI <span className="text-base font-normal text-[var(--text-secondary)]">— Smart Search</span></h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Find applications with advanced filtering
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              placeholder="Search by application number..."
              className="w-full h-10 pl-9 pr-3 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" disabled={isLoading} className="px-6">
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 ${showFilters ? 'ring-2 ring-blue-500' : ''}`}
            title="Toggle filters"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters} className="text-xs">
              Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full h-9 px-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Risk Level</label>
              <select
                value={filters.riskLevel}
                onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                className="w-full h-9 px-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RISK_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Policy Type</label>
              <select
                value={filters.policyType}
                onChange={(e) => setFilters(prev => ({ ...prev, policyType: e.target.value }))}
                className="w-full h-9 px-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
              >
                {POLICY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full h-9 px-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full h-9 px-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </form>

      {searched && data && data.length === 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
          <div className="text-3xl mb-2">🔍</div>
          <p>No applications match your search criteria.</p>
          <Button variant="ghost" onClick={clearFilters} className="mt-2 text-sm">Clear filters</Button>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-sm font-semibold">Results</h2>
            <span className="text-xs text-[var(--text-secondary)]">{data.length} found</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((app: Application & { risk_level?: string; policy_type?: string }) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.application_number}</TableCell>
                  <TableCell><StatusBadge status={app.status} /></TableCell>
                  <TableCell>
                    {app.risk_level ? (
                      <span className={`inline-flex items-center gap-1.5 text-xs`}>
                        <span className={`w-2 h-2 rounded-full ${
                          app.risk_level === 'LOW' ? 'bg-green-500' :
                          app.risk_level === 'MEDIUM' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        {app.risk_level}
                      </span>
                    ) : <span className="text-xs text-[var(--text-secondary)]">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--text-secondary)]">{app.policy_type || '—'}</TableCell>
                  <TableCell className="text-[var(--text-secondary)] text-sm">{new Date(app.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/application/${app.id}`)}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!searched && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-sm">Enter an application number or use filters to find applications.</p>
        </div>
      )}
    </div>
  )
}
