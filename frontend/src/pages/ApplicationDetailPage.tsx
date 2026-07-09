import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import api from '../services/api'
import { useAuth } from '../store/auth'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/ui/button'
import { validateField } from '../utils/validation'
import EnhancedAiOverview from '../components/EnhancedAiOverview'
import EscalationModal from '../components/EscalationModal'
import type { ApplicationDetail } from '../types'

export default function ApplicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [pdfSrc, setPdfSrc] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [editing, setEditing] = useState(false)
  const [editDetail, setEditDetail] = useState<any>(null)
  const [showEscalationModal, setShowEscalationModal] = useState(false)

  const ESCALATION_REASONS: Record<string, string> = {
    incomplete_docs: 'Incomplete Documentation',
    high_risk_profile: 'High Risk Profile',
    policy_exception: 'Policy Exception Required',
    fraud_suspicion: 'Fraud Suspicion',
    income_discrepancy: 'Income / Coverage Discrepancy',
    compliance_review: 'Needs Compliance Review',
    other: 'Other',
  }

  useEffect(() => {
    if (id && auth?.access_token) {
      setPdfSrc(`/api/applications/${id}/pdf-view?token=${auth.access_token}`)
    }
  }, [id, auth])

  const { data, isLoading, isError, error } = useQuery<ApplicationDetail>({
    queryKey: ['application', id],
    queryFn: async () => {
      const res = await api.get(`/applications/${id}`)
      return res.data
    },
    retry: false,
  })

  useEffect(() => {
    if (data?.applicant_details && editing) {
      setEditDetail({ ...data.applicant_details })
    }
  }, [data, editing])

  const actionMutation = useMutation({
    mutationFn: async ({ action, overrideReason }: { action: string; overrideReason?: string }) => {
      const formData = new FormData()
      const reasonToSend = overrideReason ?? reason
      if (reasonToSend) formData.append('reason', reasonToSend)
      await api.post(`/applications/${id}/${action}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['application', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setReason('')
      setActionError('')
      const actionLabel = vars.action.charAt(0).toUpperCase() + vars.action.slice(1)
      setActionSuccess(`${actionLabel}d successfully`)
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.detail || 'Action failed')
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/applications/${id}/details`, editDetail)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] })
      setEditing(false)
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (editDetail) {
        await api.put(`/applications/${id}/details`, editDetail)
      }
      await api.post(`/applications/${id}/submit`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] })
      setActionSuccess('Submitted successfully')
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/applications/${id}/withdraw`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] })
      setActionSuccess('Withdrawn successfully')
    },
  })

  const fieldLabels: Record<string, string> = {
    full_name: 'Full Name', dob: 'Date of Birth', age: 'Age', gender: 'Gender',
    pan: 'PAN', aadhaar: 'Aadhaar', address: 'Address', email: 'Email',
    phone: 'Phone', occupation: 'Occupation', employer: 'Employer',
    annual_income: 'Annual Income', monthly_income: 'Monthly Income',
    coverage_amount: 'Coverage Amount', policy_type: 'Policy Type', credit_score: 'Credit Score',
    bank_details: 'Bank Details', nominee: 'Nominee',
  }
  const genderOptions = ['', 'Male', 'Female', 'Other']
  const policyTypeOptions = ['', 'Health', 'Car', 'Life', 'Home', 'Travel', 'Other']

  const localFlags = useMemo(() => {
    if (!editDetail) return []
    const result: any[] = []
    for (const key of Object.keys(fieldLabels)) {
      const err = validateField(key, editDetail[key])
      if (err) result.push(err)
    }
    return result
  }, [editDetail])

  if (isLoading) return <div className="p-6 text-[var(--text-secondary)]">Loading...</div>
  if (isError) return <div className="p-6 text-red-500">{(error as any)?.response?.data?.detail || error?.message || 'Failed to load application'}</div>
  if (!data) return <div className="p-6 text-red-500">Application not found</div>

  const { application = {} as any, applicant_details, validation_flags = [], risk_assessment, decisions = [] } = data
  const role = auth?.role
  const isApplicant = role === 'APPLICANT'
  const isPM = role === 'POLICY_MANAGER'
  const isSM = role === 'SENIOR_MANAGER'

  const editableStatuses = ['DRAFT', 'UPLOADED', 'AI_PROCESSED', 'CORRECTION_REQUIRED', 'READY_TO_SUBMIT']
  const canEdit = isApplicant && editableStatuses.includes(application.status)
  const canSubmit = canEdit && ['AI_PROCESSED', 'CORRECTION_REQUIRED', 'READY_TO_SUBMIT'].includes(application.status)
  const canWithdraw = canEdit

  const handleEscalateConfirm = (escalationReason: string, remarks: string) => {
    const reasonLabel = ESCALATION_REASONS[escalationReason] || escalationReason
    const fullReason = remarks ? `${reasonLabel}\nRemarks: ${remarks}` : reasonLabel
    actionMutation.mutate({ action: 'escalate', overrideReason: fullReason })
    setShowEscalationModal(false)
  }

  return (
    <div className="space-y-6">
      <EscalationModal
        open={showEscalationModal}
        onClose={() => setShowEscalationModal(false)}
        onConfirm={handleEscalateConfirm}
        isPending={actionMutation.isPending}
      />

      {actionSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm mx-4 shadow-xl text-center">
            <div className="text-4xl mb-3 text-green-500">✓</div>
            <h2 className="text-xl font-semibold mb-2">{actionSuccess}</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">The application has been updated.</p>
            <Button onClick={() => { setActionSuccess(''); navigate('/my-applications') }}>
              Go to My Applications
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline mb-2 block">&larr; Back</button>
          <h1 className="text-2xl font-bold">
            Application {application.application_number}
            <span className="ml-3"><StatusBadge status={application.status} /></span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - PDF */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Document</h2>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 h-[600px] flex items-center justify-center">
            {pdfSrc ? (
              <iframe src={pdfSrc} className="w-full h-full rounded-lg" title="PDF" />
            ) : (
              <p className="text-[var(--text-secondary)]">No PDF</p>
            )}
          </div>
        </div>

        {/* Right - Details */}
        <div className="space-y-4">
          {/* Enhanced AI Overview — for managers only */}
          {!isApplicant && applicant_details && (
            <EnhancedAiOverview
              details={applicant_details}
              flags={validation_flags}
              risk={risk_assessment}
            />
          )}

          {/* Simple AI Summary — for applicants */}
          {isApplicant && applicant_details?.ai_summary && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">AI Overview</h3>
              <p className="text-xs text-purple-600 dark:text-purple-400">{applicant_details.ai_summary}</p>
            </div>
          )}

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Extracted Information</h2>
              {canEdit && !editing && (
                <Button onClick={() => setEditing(true)} variant="outline" size="sm">Edit</Button>
              )}
              {editing && (
                <Button onClick={() => setEditing(false)} variant="ghost" size="sm">Cancel</Button>
              )}
            </div>

            {applicant_details ? (
              <div className="space-y-2 text-sm">
                {Object.entries(fieldLabels).map(([key, label]) => {
                  if (editing && editDetail) {
                    const val = editDetail[key]
                    const flag = localFlags.find((f) => f.field_name === key)
                    const isSelect = key === 'gender' || key === 'policy_type'
                    const selectOptions = key === 'gender' ? genderOptions : policyTypeOptions
                    return (
                      <div key={key} className="mb-2">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
                        {isSelect ? (
                          <select
                            value={val ?? ''}
                            onChange={(e) => setEditDetail((prev: any) => ({ ...prev, [key]: e.target.value || null }))}
                            className={`w-full px-2 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 ${flag ? 'border-red-400' : 'border-[var(--border)]'}`}
                          >
                            {selectOptions.map((o) => (
                              <option key={o} value={o}>{o || `Select ${label}`}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={key === 'dob' ? 'date' : ['age', 'annual_income', 'monthly_income', 'coverage_amount', 'credit_score'].includes(key) ? 'number' : 'text'}
                            value={val ?? ''}
                            onChange={(e) => setEditDetail((prev: any) => ({ ...prev, [key]: e.target.value || null }))}
                            className={`w-full px-2 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 ${flag ? 'border-red-400' : 'border-[var(--border)]'}`}
                          />
                        )}
                        {flag && <p className="text-xs text-red-500 mt-0.5">{flag.message}</p>}
                      </div>
                    )
                  }
                  const val = (applicant_details as any)[key]
                  const flag = validation_flags.find((f) => f.field_name === key)
                  return (
                    <div key={key} className="flex justify-between border-b border-[var(--border)] pb-1 last:border-0">
                      <span className="text-[var(--text-secondary)]">{label}</span>
                      <span className={`font-medium ${flag && !flag.resolved ? 'text-red-500' : ''}`}>
                        {val ?? <span className="italic text-[var(--text-secondary)]">N/A</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[var(--text-secondary)] text-sm">No data extracted</p>
            )}
          </div>

          {editing && (
            <div className="flex gap-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1">
                Save Changes
              </Button>
            </div>
          )}

          {/* Applicant Actions */}
          {canEdit && !editing && (
            <div className="flex gap-2">
              {canWithdraw && (
                <Button onClick={() => { if (window.confirm('Withdraw this application?')) withdrawMutation.mutate() }} variant="destructive" disabled={withdrawMutation.isPending} className="flex-1">
                  Withdraw
                </Button>
              )}
              {canSubmit && (
                <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700">
                  Submit Application
                </Button>
              )}
            </div>
          )}

          {validation_flags.length > 0 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2">Validation Flags ({validation_flags.length})</h3>
              <div className="space-y-1">
                {validation_flags.map((f) => (
                  <div key={f.id} className={`text-xs px-2 py-1 rounded ${
                    f.severity === 'ERROR'
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {f.field_name.replace(/_/g, ' ')}: {f.message}
                    {f.resolved && <span className="ml-2 text-green-500">(Resolved)</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {decisions && decisions.length > 0 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2">Decision History</h3>
              <div className="space-y-2">
                {decisions.map((d) => (
                  <div key={d.id} className="text-xs border-l-2 pl-2 py-1"
                    style={{ borderColor: d.decision === 'APPROVED' ? '#22c55e' : d.decision === 'REJECTED' ? '#ef4444' : '#f59e0b' }}>
                    <span className="font-medium">{d.decision}</span>
                    {d.reason && <span className="text-[var(--text-secondary)]">: {d.reason}</span>}
                    <div className="text-[var(--text-secondary)]">{new Date(d.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policy Manager Review Card */}
          {isPM && application.status === 'PENDING_PM_REVIEW' && (
            <div className="bg-white dark:bg-gray-800 border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)] bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Review Application</h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">Your review and decision is required</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-4">
                {actionError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    {actionError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Decision Notes (optional)</label>
                  <textarea
                    placeholder="Add notes about your decision..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => actionMutation.mutate({ action: 'approve' })}
                    disabled={actionMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Approve
                  </button>
                  <button
                    onClick={() => actionMutation.mutate({ action: 'reject' })}
                    disabled={actionMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                    Reject
                  </button>
                  <button
                    onClick={() => setShowEscalationModal(true)}
                    disabled={actionMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-700 border-2 border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 disabled:opacity-50 text-yellow-700 dark:text-yellow-400 text-sm font-medium rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    Escalate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Senior Manager Final Decision Card */}
          {isSM && application.status === 'ESCALATED' && (
            <div className="bg-white dark:bg-gray-800 border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)] bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Final Decision</h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">This application has been escalated for your final decision</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-4">
                {actionError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    {actionError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Decision Notes (optional)</label>
                  <textarea
                    placeholder="Add notes about your final decision..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => actionMutation.mutate({ action: 'approve' })}
                    disabled={actionMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Approve
                  </button>
                  <button
                    onClick={() => actionMutation.mutate({ action: 'reject' })}
                    disabled={actionMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}