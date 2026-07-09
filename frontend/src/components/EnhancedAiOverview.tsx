import { useMemo } from 'react'
import type { ApplicantDetails, ValidationFlag, RiskAssessment } from '../types'

interface Props {
  details: ApplicantDetails | null
  flags: ValidationFlag[]
  risk: RiskAssessment | null
}

interface AssessmentMetrics {
  completeness: { filled: number; total: number; percent: number }
  incomeHealth: { ratio: number | null; status: string; detail: string }
  creditStatus: { score: number | null; status: string }
  riskFactors: { field: string; message: string; severity: string }[]
  overall: { label: string; color: string; description: string }
}

const REQUIRED_FIELDS = [
  'full_name', 'dob', 'age', 'gender', 'pan', 'aadhaar',
  'email', 'phone', 'occupation', 'annual_income',
  'coverage_amount', 'policy_type',
]

export default function EnhancedAiOverview({ details, flags, risk }: Props) {
  const assessment: AssessmentMetrics = useMemo(() => {
    if (!details) {
      return {
        completeness: { filled: 0, total: REQUIRED_FIELDS.length, percent: 0 },
        incomeHealth: { ratio: null, status: 'unknown', detail: 'No income data available' },
        creditStatus: { score: null, status: 'unknown' },
        riskFactors: [],
        overall: { label: 'No Data', color: 'gray', description: 'Application data not yet extracted.' },
      }
    }

    const filled = REQUIRED_FIELDS.filter((f) => {
      const v = (details as any)[f]
      return v !== null && v !== undefined && v !== ''
    }).length
    const percent = Math.round((filled / REQUIRED_FIELDS.length) * 100)

    const annualIncome = details.annual_income ? Number(details.annual_income) : null
    const coverageAmount = details.coverage_amount ? Number(details.coverage_amount) : null
    let ratio: number | null = null
    let incomeStatus = 'unknown'
    let incomeDetail = 'Income data not available'
    if (annualIncome && coverageAmount && annualIncome > 0) {
      ratio = coverageAmount / annualIncome
      if (ratio > 10) {
        incomeStatus = 'critical'
        incomeDetail = `Coverage is ${ratio.toFixed(1)}x annual income (exceeds 10x limit)`
      } else if (ratio > 5) {
        incomeStatus = 'warning'
        incomeDetail = `Coverage is ${ratio.toFixed(1)}x annual income (moderate)`
      } else {
        incomeStatus = 'good'
        incomeDetail = `Coverage is ${ratio.toFixed(1)}x annual income (within limits)`
      }
    } else if (annualIncome) {
      incomeDetail = `Annual income: ₹${annualIncome.toLocaleString()}`
    }

    const creditScore = details.credit_score ? Number(details.credit_score) : null
    let creditStatus: { score: number | null; status: string } = { score: null, status: 'unknown' }
    if (creditScore !== null) {
      if (creditScore >= 750) creditStatus = { score: creditScore, status: 'excellent' }
      else if (creditScore >= 700) creditStatus = { score: creditScore, status: 'good' }
      else if (creditScore >= 600) creditStatus = { score: creditScore, status: 'fair' }
      else creditStatus = { score: creditScore, status: 'poor' }
    }

    const riskFactors = flags
      .filter((f) => !f.resolved && f.severity === 'ERROR')
      .map((f) => ({ field: f.field_name, message: f.message, severity: f.severity }))

    if (details.annual_income && Number(details.annual_income) < 200000) {
      riskFactors.push({ field: 'annual_income', message: 'Annual income below ₹2,00,000 threshold', severity: 'ERROR' })
    }
    if (details.age && (Number(details.age) < 21 || Number(details.age) > 60)) {
      riskFactors.push({ field: 'age', message: `Age ${details.age} is outside 21-60 range`, severity: 'ERROR' })
    }

    let overallLabel: string
    let overallColor: string
    let overallDesc: string

    const hasCriticalFlags = riskFactors.length > 0
    const hasRiskLevel = risk?.risk_level === 'HIGH'
    const hasMediumRisk = risk?.risk_level === 'MEDIUM'

    if (hasCriticalFlags || hasRiskLevel) {
      overallLabel = 'Needs Review'
      overallColor = 'red'
      overallDesc = hasCriticalFlags
        ? `${riskFactors.length} validation error(s) require attention`
        : 'High risk assessment — needs manager review'
    } else if (hasMediumRisk) {
      overallLabel = 'Caution'
      overallColor = 'yellow'
      overallDesc = 'Medium risk — review before proceeding'
    } else if (percent >= 80) {
      overallLabel = 'Good'
      overallColor = 'green'
      overallDesc = 'High data completeness with acceptable risk'
    } else if (percent >= 50) {
      overallLabel = 'Partial'
      overallColor = 'yellow'
      overallDesc = 'Partially complete — review missing fields'
    } else {
      overallLabel = 'Incomplete'
      overallColor = 'red'
      overallDesc = 'Most fields are missing — needs data entry'
    }

    return {
      completeness: { filled, total: REQUIRED_FIELDS.length, percent },
      incomeHealth: { ratio, status: incomeStatus, detail: incomeDetail },
      creditStatus,
      riskFactors,
      overall: { label: overallLabel, color: overallColor, description: overallDesc },
    }
  }, [details, flags, risk])

  if (!details) return null

  const colorClasses: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800', badge: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', badge: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' },
    gray: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700', badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  }
  const cc = colorClasses[assessment.overall.color] || colorClasses.gray

  return (
    <div className={`rounded-xl border ${cc.border} ${cc.bg} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
          AI Assessment
        </h3>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cc.badge}`}>
          {assessment.overall.label}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-[var(--border)]">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">Completeness</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  assessment.completeness.percent >= 80 ? 'bg-green-500' :
                  assessment.completeness.percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${assessment.completeness.percent}%` }}
              />
            </div>
            <span className="text-sm font-semibold">{assessment.completeness.percent}%</span>
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            {assessment.completeness.filled}/{assessment.completeness.total} fields
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-[var(--border)]">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">Income Health</div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold ${
              assessment.incomeHealth.status === 'good' ? 'text-green-600' :
              assessment.incomeHealth.status === 'warning' ? 'text-yellow-600' :
              assessment.incomeHealth.status === 'critical' ? 'text-red-600' : 'text-[var(--text-secondary)]'
            }`}>
              {assessment.incomeHealth.status === 'good' && 'Healthy'}
              {assessment.incomeHealth.status === 'warning' && 'Moderate'}
              {assessment.incomeHealth.status === 'critical' && 'High Ratio'}
              {assessment.incomeHealth.status === 'unknown' && 'N/A'}
            </span>
            {assessment.incomeHealth.ratio !== null && (
              <span className="text-[10px] text-[var(--text-secondary)]">
                ({assessment.incomeHealth.ratio.toFixed(1)}x)
              </span>
            )}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">{assessment.incomeHealth.detail}</div>
        </div>

        <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-[var(--border)]">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">Credit Score</div>
          <div className="flex items-center gap-1.5">
            {assessment.creditStatus.score !== null ? (
              <>
                <span className={`text-sm font-semibold ${
                  assessment.creditStatus.status === 'excellent' ? 'text-green-600' :
                  assessment.creditStatus.status === 'good' ? 'text-blue-600' :
                  assessment.creditStatus.status === 'fair' ? 'text-yellow-600' : 'text-red-600'
                }`}>{assessment.creditStatus.score}</span>
                <span className="text-[10px] text-[var(--text-secondary)] capitalize">{assessment.creditStatus.status}</span>
              </>
            ) : (
              <span className="text-xs text-[var(--text-secondary)]">Not available</span>
            )}
          </div>
        </div>
      </div>

      {assessment.riskFactors.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Risk Factors ({assessment.riskFactors.length})
          </div>
          <div className="space-y-1">
            {assessment.riskFactors.slice(0, 5).map((f, i) => (
              <div key={i} className="text-xs flex items-start gap-1.5">
                <span className="text-red-500 mt-0.5 shrink-0">•</span>
                <span className="text-[var(--text-secondary)]">
                  <span className="font-medium capitalize">{f.field.replace(/_/g, ' ')}:</span> {f.message}
                </span>
              </div>
            ))}
            {assessment.riskFactors.length > 5 && (
              <div className="text-xs text-[var(--text-secondary)] pl-4">
                +{assessment.riskFactors.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {details.ai_summary && (
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-3 mt-1">
          {details.ai_summary}
        </div>
      )}
    </div>
  )
}