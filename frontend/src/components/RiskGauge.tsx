import { useMemo, useState } from 'react'

export interface RiskGaugeProps {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  riskScore: number
  riskExplanation?: string
  size?: 'sm' | 'md' | 'lg'
}

const getRiskColor = (level: string): string => {
  switch (level) {
    case 'LOW': return '#10b981'
    case 'MEDIUM': return '#f59e0b'
    case 'HIGH': return '#ef4444'
    default: return '#6b7280'
  }
}

const getRiskGradient = (level: string): string => {
  switch (level) {
    case 'LOW': return 'url(#lowGradient)'
    case 'MEDIUM': return 'url(#mediumGradient)'
    case 'HIGH': return 'url(#highGradient)'
    default: return 'url(#lowGradient)'
  }
}

const getRiskLabel = (level: string): string => {
  switch (level) {
    case 'LOW': return 'Low Risk'
    case 'MEDIUM': return 'Medium Risk'
    case 'HIGH': return 'High Risk'
    default: return 'Unknown'
  }
}

const getScoreText = (score: number): string => {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Critical'
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  if (score >= 20) return '#f97316'
  return '#ef4444'
}

const sizeMap = { sm: 100, md: 140, lg: 180 }
const strokeMap = { sm: 6, md: 8, lg: 10 }

export default function RiskGauge({ riskLevel, riskScore, riskExplanation, size = 'md' }: RiskGaugeProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const dim = sizeMap[size]
  const stroke = strokeMap[size]
  const center = dim / 2
  const radius = center - stroke - 4
  const circumference = 2 * Math.PI * radius
  const color = useMemo(() => getRiskColor(riskLevel), [riskLevel])

  const strokeDashoffset = useMemo(() => {
    return ((100 - Math.min(riskScore, 100)) / 100) * circumference
  }, [riskScore, circumference])

  const glowId = `glow-${riskLevel.toLowerCase()}`

  return (
    <div
      className="relative inline-flex flex-col items-center"
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      <svg width={dim} height={dim} className="transform -rotate-90">
        <defs>
          <linearGradient id="lowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="mediumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="highGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          stroke="var(--border)"
          strokeWidth={stroke}
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
          className="opacity-30"
        />

        <circle
          stroke={getRiskGradient(riskLevel)}
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
          filter={`url(#${glowId})`}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />

        <circle
          cx={center}
          cy={center}
          r={radius * 0.55}
          fill="var(--bg-card)"
          stroke="var(--border)"
          strokeWidth="0.5"
          className="opacity-90"
        />
      </svg>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ width: dim, height: dim }}
      >
        <div
          className="font-bold leading-none"
          style={{ fontSize: dim * 0.18, color: getScoreColor(riskScore) }}
        >
          {riskScore}
        </div>
        <div
          className="font-semibold tracking-wide leading-tight mt-0.5"
          style={{ fontSize: dim * 0.08, color }}
        >
          {riskLevel}
        </div>
        <div
          className="leading-tight"
          style={{ fontSize: dim * 0.07, color: 'var(--text-secondary)' }}
        >
          {getScoreText(riskScore)}
        </div>
      </div>

      {tooltipVisible && riskExplanation && (
        <div className="absolute z-10 bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap max-w-[200px] text-center">
          {riskExplanation}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}

      <div className="mt-1">
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${color}20`,
            color,
            border: `1px solid ${color}40`,
          }}
        >
          {getRiskLabel(riskLevel)}
        </span>
      </div>
    </div>
  )
}
