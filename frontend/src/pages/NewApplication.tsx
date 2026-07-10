import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../store/auth'
import Button from '../components/ui/button'
import { validateField } from '../utils/validation'
import type { ApplicationDetail } from '../types'

const fieldSections = [
  {
    title: 'Personal Details',
    icon: '👤',
    fields: ['full_name', 'dob', 'age', 'gender'] as const,
  },
  {
    title: 'Identity & Contact',
    icon: '🪪',
    fields: ['pan', 'aadhaar', 'email', 'phone', 'address'] as const,
  },
  {
    title: 'Income & Employment',
    icon: '💰',
    fields: ['occupation', 'employer', 'annual_income', 'monthly_income'] as const,
  },
  {
    title: 'Policy Details',
    icon: '📋',
    fields: ['policy_type', 'coverage_amount', 'credit_score'] as const,
  },
  {
    title: 'Bank & Nominee',
    icon: '🏦',
    fields: ['bank_details', 'nominee'] as const,
  },
]

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

const SUPPORTED_DOC_TYPES = [
  { value: 'AADHAAR', label: 'Aadhaar Card' },
  { value: 'PAN', label: 'PAN Card' },
  { value: 'INCOME', label: 'Income Proof' },
  { value: 'OTHER', label: 'Other Document' },
]

export default function NewApplication() {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const [appId, setAppId] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [flags, setFlags] = useState<any[]>([])
  const [risk, setRisk] = useState<any>(null)
  const [status, setStatus] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [pdfSrc, setPdfSrc] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [showSuccess, setShowSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Auto-create draft on page load
  useEffect(() => {
    api.post('/applications/draft').then((res) => {
      setAppId(res.data.id)
      setStatus(res.data.status)
    }).catch((err) => {
      const detail = err.response?.data?.detail || err.message
      if (err.response?.status === 403) {
        setError('Only applicants can create applications. Please log in with an applicant account.')
      } else {
        setError(`Failed to create draft: ${detail}. Is the backend running?`)
      }
    })
  }, [])

  // Set PDF src with token for iframe access
  useEffect(() => {
    if (appId && auth?.access_token) {
      setPdfSrc(`/api/applications/${appId}/pdf-view?token=${auth.access_token}`)
    } else {
      setPdfSrc('')
    }
  }, [appId, auth])

  const handleFileUpload = async (selectedFile?: File) => {
    const uploadFile = selectedFile || file
    if (!appId || !uploadFile) return
    setProcessing(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      await api.post(`/applications/${appId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const res = await api.post(`/applications/${appId}/process-ai`)
      const data = res.data as ApplicationDetail
      setDetail(data.applicant_details)
      setFlags(data.validation_flags)
      setRisk(data.risk_assessment)
      setStatus(data.application.status)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Processing failed. Check that the backend and AI provider are running.')
    } finally {
      setProcessing(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null
    setFile(selected)
    if (selected && appId) {
      handleFileUpload(selected)
    }
  }

  const handleFieldChange = (field: string, value: string | number | null) => {
    setDetail((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!appId) return
    try {
      const res = await api.put(`/applications/${appId}/details`, detail)
      const data = res.data as ApplicationDetail
      setDetail(data.applicant_details)
      setFlags(data.validation_flags)
      setRisk(data.risk_assessment)
      setStatus(data.application.status)
      setEditing(false)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Save failed')
    }
  }

  const handleSubmit = async () => {
    if (!appId) return
    try {
      if (editing && detail) {
        await api.put(`/applications/${appId}/details`, detail)
      }
      await api.post(`/applications/${appId}/submit`)
      setShowSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Submission failed')
    }
  }

  const handleWithdraw = async () => {
    if (!appId) return
    if (!window.confirm('Are you sure you want to withdraw this application?')) return
    try {
      await api.post(`/applications/${appId}/withdraw`)
      setShowSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Withdraw failed')
    }
  }

  const canWithdraw = detail && (status === 'DRAFT' || status === 'UPLOADED' || status === 'AI_PROCESSED' || status === 'CORRECTION_REQUIRED' || status === 'READY_TO_SUBMIT')

  const [supportingDocType, setSupportingDocType] = useState('AADHAAR')
  const [supportingDocFile, setSupportingDocFile] = useState<File | null>(null)
  const [supportingDocs, setSupportingDocs] = useState<any[]>([])
  const [uploadingDoc, setUploadingDoc] = useState(false)

  const handleSupportingDocUpload = async () => {
    if (!appId || !supportingDocFile) return
    setUploadingDoc(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('doc_type', supportingDocType)
      formData.append('file', supportingDocFile)
      const res = await api.post(`/applications/${appId}/supporting-docs`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSupportingDocs(prev => [...prev, res.data])
      setSupportingDocFile(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploadingDoc(false)
    }
  }

  // Frontend-only validation flags — computed in real-time during editing
  const localFlags = useMemo(() => {
    if (!detail) return flags
    const result: any[] = []
    for (const key of Object.keys(fieldLabels)) {
      const err = validateField(key, detail[key])
      if (err) result.push(err)
    }
    const coverageAmount = Number(detail.coverage_amount)
    const annualIncome = Number(detail.annual_income)
    if (!isNaN(coverageAmount) && !isNaN(annualIncome) && coverageAmount > 0 && annualIncome > 0) {
      if (coverageAmount > 10 * annualIncome) {
        result.push({
          field_name: 'coverage_amount',
          message: 'Coverage amount exceeds 10x annual income limit',
          severity: 'ERROR',
        })
      }
    }
    return result
  }, [detail, flags])

  const displayFlags = editing ? localFlags : flags
  const unresolvedErrors = displayFlags.filter((f) => f.severity === 'ERROR')
  const canSubmit = status === 'DRAFT' || status === 'AI_PROCESSED' || status === 'CORRECTION_REQUIRED' || status === 'READY_TO_SUBMIT'
  const isApplicant = auth?.role === 'APPLICANT'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Application</h1>

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm mx-4 shadow-xl text-center">
            <div className="text-4xl mb-3">✓</div>
            <h2 className="text-xl font-semibold mb-2">Application Submitted</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Your application has been submitted successfully. It is now pending review by the policy manager.
            </p>
            <Button onClick={() => navigate('/my-applications')}>
              Go to My Applications
            </Button>
          </div>
        </div>
      )}

      {/* Upload area shown until detail is populated */}
      {!detail && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 text-center">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg text-left">
              {error}
            </div>
          )}
          {appId && !processing && !file && (
            <>
              <p className="mb-4 text-[var(--text-secondary)]">Select a PDF document to upload</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Select PDF
              </button>
            </>
          )}
          {processing && (
            <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
              <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Uploading & extracting with AI…
            </div>
          )}
          {file && !processing && (
            <p className="text-sm text-[var(--text-secondary)]">{file.name}</p>
          )}
        </div>
      )}

      {detail && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left - PDF Preview */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Uploaded Document</h2>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 h-[600px] flex items-center justify-center">
              {pdfSrc ? (
                <iframe
                  src={pdfSrc}
                  className="w-full h-full rounded-lg"
                  title="PDF Preview"
                />
              ) : (
                <p className="text-[var(--text-secondary)]">No document uploaded yet</p>
              )}
            </div>
          </div>

          {/* Right - AI Summary + Risk + Extracted Fields */}
          <div>
            {/* AI Summary — at top, for all users */}
            {detail?.ai_summary && (
              <div className="mb-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">AI Overview</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400">{detail.ai_summary}</p>
              </div>
            )}

            {/* Risk Assessment — at top for managers/seniors, hidden from applicant */}
            {risk && !isApplicant && (
              <div className={`mb-4 rounded-xl p-4 border ${
                risk.risk_level === 'HIGH' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                risk.risk_level === 'MEDIUM' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              }`}>
                <h3 className="text-sm font-semibold mb-1">Risk Assessment: {risk.risk_level}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{risk.explanation}</p>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Extracted Information</h2>
              <Button
                onClick={() => setEditing(!editing)}
                variant="outline"
                size="sm"
              >
                {editing ? 'View Mode' : 'Edit'}
              </Button>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {fieldSections.map((section) => {
                const sectionFlags = displayFlags.filter((f) => (section.fields as readonly string[]).includes(f.field_name))
                const hasSectionErrors = sectionFlags.some(f => f.severity === 'ERROR')
                return (
                  <div key={section.title} className={`rounded-lg border ${hasSectionErrors ? 'border-red-200 dark:border-red-800' : 'border-[var(--border)]'} overflow-hidden`}>
                    <div className={`px-3 py-2 font-medium text-xs flex items-center gap-2 ${hasSectionErrors ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>
                      <span>{section.icon}</span>
                      <span>{section.title}</span>
                      {hasSectionErrors && <span className="ml-auto text-red-500">⚠</span>}
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                      {section.fields.map((key) => {
                        const flag = displayFlags.find((f) => f.field_name === key)
                        const val = detail?.[key]
                        const label = fieldLabels[key as string]
                        const isSelect = key === 'gender' || key === 'policy_type'
                        const selectOptions = key === 'gender' ? genderOptions : policyTypeOptions
                        return (
                          <div key={key} className="px-3 py-2">
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
                            {editing ? (
                              isSelect ? (
                                <select
                                  value={val ?? ''}
                                  onChange={(e) => handleFieldChange(key, e.target.value || null)}
                                  className={`w-full px-2 py-1 text-sm border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 ${flag ? 'border-red-400' : 'border-[var(--border)]'}`}
                                >
                                  {selectOptions.map((o) => (
                                    <option key={o} value={o}>{o || `Select ${label}`}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={key === 'dob' ? 'date' : ['age', 'annual_income', 'monthly_income', 'coverage_amount', 'credit_score'].includes(key) ? 'number' : 'text'}
                                  value={val ?? ''}
                                  onChange={(e) => handleFieldChange(key, e.target.value || null)}
                                  className={`w-full px-2 py-1 text-sm border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 ${flag ? 'border-red-400' : 'border-[var(--border)]'}`}
                                />
                              )
                            ) : (
                              <div className={`px-2 py-1 text-sm rounded-md bg-[var(--bg-secondary)] ${flag ? 'border border-red-300' : ''}`}>
                                {val ?? <span className="text-[var(--text-secondary)] italic">Not provided</span>}
                              </div>
                            )}
                            {flag && (
                              <p className="text-xs text-red-500 mt-0.5">{flag.message}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {editing && (
              <Button onClick={handleSave} className="w-full mt-3">
                Save Changes
              </Button>
            )}

            {/* Supporting Documents Upload */}
            {detail && (
              <div className="mt-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Supporting Documents</h3>

                {supportingDocs.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {supportingDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-md">
                        <svg className="w-3.5 h-3.5 text-green-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        <span className="font-medium">{doc.doc_type}</span>
                        <span className="text-[var(--text-secondary)]">{doc.filename}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <select
                    value={supportingDocType}
                    onChange={(e) => setSupportingDocType(e.target.value)}
                    className="h-9 px-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SUPPORTED_DOC_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSupportingDocFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="supporting-doc-input"
                  />
                  <label
                    htmlFor="supporting-doc-input"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                    </svg>
                    {supportingDocFile ? supportingDocFile.name : 'Choose PDF'}
                  </label>
                  {supportingDocFile && (
                    <Button
                      size="sm"
                      onClick={handleSupportingDocUpload}
                      disabled={uploadingDoc}
                    >
                      {uploadingDoc ? '...' : 'Upload'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Validation Errors Summary */}
            {unresolvedErrors.length > 0 && (
              <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">
                  {unresolvedErrors.length} Validation Error(s)
                </h3>
                <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                  {unresolvedErrors.slice(0, 8).map((f) => (
                    <li key={f.id}>• {f.field_name.replace(/_/g, ' ')}: {f.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {detail && canSubmit && (
        <div className="flex justify-end gap-3">
          {canWithdraw && (
            <Button onClick={handleWithdraw} variant="destructive">
              Withdraw Application
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={unresolvedErrors.length > 0}
            className="bg-green-600 hover:bg-green-700">
            Submit Application
          </Button>
        </div>
      )}
    </div>
  )
}
