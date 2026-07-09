const REQUIRED_FIELDS = [
  'full_name', 'dob', 'age', 'gender', 'pan', 'aadhaar',
  'email', 'phone', 'occupation', 'annual_income',
  'coverage_amount', 'policy_type',
]

export function validateField(field: string, value: any): { field_name: string; message: string; severity: string } | null {
  const label = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  if (REQUIRED_FIELDS.includes(field) && (value === null || value === undefined || value === '')) {
    return { field_name: field, message: `${label} is required`, severity: 'ERROR' }
  }

  if (value === null || value === undefined || value === '') return null

  if (field === 'age') {
    const n = Number(value)
    if (isNaN(n)) return { field_name: field, message: 'Age must be a valid number', severity: 'ERROR' }
    if (n < 21 || n > 60) return { field_name: field, message: 'Age must be between 21 and 60', severity: 'ERROR' }
  }

  if (field === 'pan') {
    const cleaned = String(value).toUpperCase().trim()
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleaned))
      return { field_name: field, message: 'PAN must be in format ABCDE1234F', severity: 'ERROR' }
  }

  if (field === 'aadhaar') {
    const cleaned = String(value).replace(/[\s\-]/g, '')
    if (!/^\d{12}$/.test(cleaned))
      return { field_name: field, message: 'Aadhaar must be exactly 12 digits', severity: 'ERROR' }
  }

  if (field === 'email') {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value).trim()))
      return { field_name: field, message: 'Invalid email format', severity: 'ERROR' }
  }

  if (field === 'phone') {
    let cleaned = String(value).replace(/[\s\-\(\)\+]/g, '')
    if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.slice(2)
    if (!/^\d{10}$/.test(cleaned))
      return { field_name: field, message: 'Phone must be exactly 10 digits', severity: 'ERROR' }
  }

  if (field === 'annual_income' || field === 'monthly_income' || field === 'coverage_amount') {
    const n = Number(value)
    if (isNaN(n) || n <= 0)
      return { field_name: field, message: `${label} must be positive`, severity: 'ERROR' }
  }

  if (field === 'gender') {
    const g = String(value).trim().toUpperCase()
    if (!['MALE', 'FEMALE', 'OTHER'].includes(g))
      return { field_name: field, message: 'Gender must be Male, Female, or Other', severity: 'WARNING' }
  }

  return null
}

export function validateDetail(data: Record<string, any>): any[] {
  const flags: any[] = []
  for (const field of REQUIRED_FIELDS) {
    const err = validateField(field, data[field])
    if (err) flags.push(err)
  }
  // loan multiplier check
  const coverageAmount = Number(data.coverage_amount)
  const annualIncome = Number(data.annual_income)
  if (!isNaN(coverageAmount) && !isNaN(annualIncome) && coverageAmount > 0 && annualIncome > 0) {
    if (coverageAmount > 10 * annualIncome) {
      flags.push({
        field_name: 'coverage_amount',
        message: 'Coverage amount exceeds 10x annual income limit',
        severity: 'ERROR',
      })
    }
  }
  return flags
}
