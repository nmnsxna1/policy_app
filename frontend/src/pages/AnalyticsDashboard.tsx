import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../services/api'
import { useAuth } from '../store/auth'
import StatusBadge from '../components/StatusBadge'
import RiskGauge from '../components/RiskGauge'
import Button from '../components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import type { AnalyticsDashboardData, MonthlyTrend, RiskDistribution } from '../types'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const CHART_COLORS = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444' }

function StatCard({ icon, label, value, subtitle, color, badge }: { icon: React.ReactNode; label: string; value: string | number; subtitle?: string; color: string; badge?: { text: string; color: string } }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-[var(--text-secondary)]">{label}</div>
          {subtitle && <div className="text-[10px] text-[var(--text-secondary)]">{subtitle}</div>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      {badge && (
        <div className="mt-2">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
            {badge.text}
          </span>
        </div>
      )}
    </div>
  )
}

export default function AnalyticsDashboard() {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const reportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [days, setDays] = useState(90)

  const { data, isLoading } = useQuery<AnalyticsDashboardData>({
    queryKey: ['analytics-dashboard', days],
    queryFn: async () => {
      const res = await api.get(`/analytics/dashboard?days=${days}`)
      return res.data
    },
  })

  const { data: trends } = useQuery<MonthlyTrend[]>({
    queryKey: ['analytics-trends', days],
    queryFn: async () => {
      const res = await api.get(`/analytics/trends?days=${days}`)
      return res.data
    },
  })

  const { data: riskDist } = useQuery<RiskDistribution>({
    queryKey: ['analytics-risk-distribution'],
    queryFn: async () => {
      const res = await api.get('/analytics/risk-distribution')
      return res.data
    },
  })

  const riskData = useMemo(() => {
    if (!riskDist) return []
    return riskDist.labels.map((label, i) => ({
      name: label.charAt(0) + label.slice(1).toLowerCase(),
      value: riskDist.values[i],
      percentage: riskDist.percentages[i],
      color: CHART_COLORS[label as keyof typeof CHART_COLORS],
    }))
  }, [riskDist])

  const handleExportPDF = async () => {
    if (!reportRef.current) return
    setExporting(true)
    try {
      await new Promise(r => setTimeout(r, 500))

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (doc) => {
          doc.querySelectorAll('svg').forEach(svg => {
            const rect = svg.getBoundingClientRect()
            svg.setAttribute('width', String(rect.width))
            svg.setAttribute('height', String(rect.height))
          })
        },
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('l', 'mm', 'a3')
      const pageWidth = 420
      const pageHeight = (canvas.height * pageWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)
      pdf.save(`analytics-report-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  if (isLoading) return <div className="p-6 text-[var(--text-secondary)]">Loading analytics...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">PolicyPilotAI <span className="text-base font-normal text-[var(--text-secondary)]">— Analytics Dashboard</span></h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Performance metrics and insights for {auth?.username}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 px-3 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </select>
          <Button onClick={handleExportPDF} disabled={exporting} className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* KPI Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>}
              label="Total Applications"
              value={data.total_applications}
              subtitle={`${data.submitted_count} submitted`}
              color="bg-blue-100 dark:bg-blue-900/30"
            />
            <StatCard
              icon={<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
              label="Approved"
              value={data.approved_count}
              subtitle={`${data.approval_rate}% of submitted`}
              color="bg-green-100 dark:bg-green-900/30"
              badge={data.approval_rate >= 60 ? { text: `✓ ${data.approval_rate}% approval`, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' } : undefined}
            />
            <StatCard
              icon={<svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>}
              label="Rejected"
              value={data.rejected_count}
              subtitle={`${data.rejection_rate}% of submitted`}
              color="bg-red-100 dark:bg-red-900/30"
            />
            <StatCard
              icon={<svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
              label="Pending Review"
              value={data.pending_count}
              subtitle="Awaiting decision"
              color="bg-orange-100 dark:bg-orange-900/30"
            />
            <StatCard
              icon={<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>}
              label="Escalated"
              value={data.escalated_count}
              subtitle="Senior review needed"
              color="bg-purple-100 dark:bg-purple-900/30"
            />
            <StatCard
              icon={<svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
              label="Avg Risk Score"
              value={data.avg_risk_score ?? 'N/A'}
              subtitle="Lower is riskier"
              color="bg-cyan-100 dark:bg-cyan-900/30"
              badge={data.avg_risk_score >= 50 ? { text: 'Stable', color: 'bg-green-100 text-green-700' } : { text: 'Elevated', color: 'bg-red-100 text-red-700' }}
            />
          </div>
        )}

        {data && data.risk_distribution && (
          <div className="flex items-center gap-3 flex-wrap">
            {Object.entries(data.risk_distribution).map(([level, count]) => (
              <div key={level} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[level as keyof typeof CHART_COLORS] }} />
                <span className="text-xs font-medium">{level.charAt(0) + level.slice(1).toLowerCase()}: {count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Distribution Pie */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Risk Distribution</h3>
            {riskData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke={entry.color} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-sm text-[var(--text-secondary)]">No risk data available</div>
            )}
          </div>

          {/* Monthly Trends Bar */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Monthly Trends</h3>
            {trends && trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                  />
                  <Legend />
                  <Bar dataKey="submitted" name="Submitted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-sm text-[var(--text-secondary)]">No trend data available</div>
            )}
          </div>
        </div>

        {/* Applications Table */}
        {data && data.applications && data.applications.length > 0 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-base font-semibold">Recent Applications</h2>
              <span className="text-xs text-[var(--text-secondary)]">{data.total_applications} total</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.applications.slice(0, 10).map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.application_number}</TableCell>
                    <TableCell><StatusBadge status={app.status} /></TableCell>
                    <TableCell>
                      {app.risk_level && app.risk_score != null ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: CHART_COLORS[app.risk_level as keyof typeof CHART_COLORS] }} />
                          <span className="text-xs">{app.risk_level} ({app.risk_score})</span>
                        </span>
                      ) : <span className="text-xs text-[var(--text-secondary)]">—</span>}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)] text-sm">
                      {new Date(app.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/application/${app.id}`)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
