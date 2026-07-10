export interface User {
  id: number
  username: string
  email?: string
  role: 'APPLICANT' | 'POLICY_MANAGER' | 'SENIOR_MANAGER'
}

export interface AuthState {
  access_token: string
  token_type: string
  role: string
  user_id: number
  username: string
}

export interface Application {
  id: number
  application_number: string
  applicant_id: number
  status: string
  pdf_path?: string
  created_at: string
  updated_at: string
  submitted_at?: string
}

export interface ApplicantDetails {
  id?: number
  application_id?: number
  full_name?: string | null
  dob?: string | null
  age?: number | null
  gender?: string | null
  pan?: string | null
  aadhaar?: string | null
  address?: string | null
  email?: string | null
  phone?: string | null
  occupation?: string | null
  employer?: string | null
  annual_income?: number | null
  monthly_income?: number | null
  coverage_amount?: number | null
  policy_type?: string | null
  credit_score?: number | null
  bank_details?: string | null
  nominee?: string | null
  ai_summary?: string | null
}

export interface ValidationFlag {
  id: number
  field_name: string
  message: string
  severity: string
  resolved: boolean
}

export interface RiskAssessment {
  id?: number
  application_id?: number
  risk_level: string
  explanation?: string | null
}

export interface Decision {
  id: number
  application_id: number
  decision_maker_id: number
  decision: string
  reason?: string | null
  created_at: string
}

export interface SupportingDocument {
  id: number
  application_id: number
  doc_type: string
  filename: string
  uploaded_at: string
}

export interface ApplicationDetail {
  application: Application
  applicant_details: ApplicantDetails | null
  validation_flags: ValidationFlag[]
  risk_assessment: RiskAssessment | null
  decisions: Decision[]
  supporting_documents?: SupportingDocument[]
}

export interface DashboardData {
  pending_count: number
  submitted_count?: number
  escalated_count?: number
  total_count?: number
  draft_count?: number
  in_review_count?: number
  flagged_count?: number
  approved_count?: number
  rejected_count?: number
  applications?: Application[]
  pending_applications?: Application[]
  escalated_applications?: Application[]
}

export interface AnalyticsDashboardData {
  total_applications: number
  submitted_count: number
  approved_count: number
  rejected_count: number
  pending_count: number
  escalated_count: number
  draft_count: number
  approval_rate: number
  rejection_rate: number
  avg_risk_score: number
  risk_distribution: Record<string, number>
  applications: (Application & { risk_level?: string; risk_score?: number })[]
}

export interface MonthlyTrend {
  month: string
  submitted: number
  approved: number
  rejected: number
  total: number
}

export interface RiskDistribution {
  labels: string[]
  values: number[]
  percentages: number[]
}
