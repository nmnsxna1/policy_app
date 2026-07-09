import { useState } from 'react'
import Button from './ui/button'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string, remarks: string) => void
  isPending: boolean
}

const ESCALATION_REASONS = [
  { value: 'incomplete_docs', label: 'Incomplete Documentation' },
  { value: 'high_risk_profile', label: 'High Risk Profile' },
  { value: 'policy_exception', label: 'Policy Exception Required' },
  { value: 'fraud_suspicion', label: 'Fraud Suspicion' },
  { value: 'income_discrepancy', label: 'Income / Coverage Discrepancy' },
  { value: 'compliance_review', label: 'Needs Compliance Review' },
  { value: 'other', label: 'Other' },
]

export default function EscalationModal({ open, onClose, onConfirm, isPending }: Props) {
  const [selectedReason, setSelectedReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const handleConfirm = () => {
    if (!selectedReason) {
      setError('Please select a reason for escalation')
      return
    }
    setError('')
    onConfirm(selectedReason, remarks)
  }

  const handleClose = () => {
    setSelectedReason('')
    setRemarks('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Escalate Application</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                This will escalate the application to Senior Management for final decision.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Escalation Reason</label>
            <select
              value={selectedReason}
              onChange={(e) => { setSelectedReason(e.target.value); setError('') }}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a reason...</option>
              {ESCALATION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Remarks (optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any additional remarks or context for the Senior Manager..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] flex gap-3 justify-end">
          <Button onClick={handleClose} variant="outline" disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}
            className="bg-yellow-600 hover:bg-yellow-700 text-white shadow-sm">
            {isPending ? 'Escalating...' : 'Confirm Escalation'}
          </Button>
        </div>
      </div>
    </div>
  )
}