import { useState, useEffect, useRef } from 'react'
import type { ApplicantDetails, ValidationFlag, RiskAssessment } from '../types'

interface PdfHighlighterProps {
  pdfUrl?: string
  applicationId?: string
  extractedData: ApplicantDetails | null
  validationFlags?: ValidationFlag[]
  risk?: RiskAssessment | null
}

export default function PdfHighlighter({ pdfUrl, applicationId, extractedData, validationFlags, risk }: PdfHighlighterProps) {
  const [highlights, setHighlights] = useState<Array<{ text: string; selector: string; color: string; reason: string }>>([])
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  // Generate highlights based on extracted data
  useEffect(() => {
    if (!extractedData) return

    const newHighlights: Array<{ text: string; selector: string; color: string; reason: string }> = []

    // Personal Information fields
    if (extractedData.full_name) {
      newHighlights.push({
        text: extractedData.full_name,
        selector: `.full-name-highlight`,
        color: '#3b82f6',
        reason: 'Extracted full name from PDF'
      })
    }

    if (extractedData.email) {
      newHighlights.push({
        text: extractedData.email,
        selector: `.email-highlight`,
        color: '#10b981',
        reason: 'Extracted email from PDF'
      })
    }

    if (extractedData.pan) {
      newHighlights.push({
        text: extractedData.pan,
        selector: `.pan-highlight`,
        color: '#f59e0b',
        reason: 'Extracted PAN from PDF'
      })
    }

    if (extractedData.age) {
      newHighlights.push({
        text: `Age ${extractedData.age}`,
        selector: `.age-highlight`,
        color: '#8b5cf6',
        reason: 'Extracted age from PDF'
      })
    }

    // Salary/Income fields
    if (extractedData.annual_income || extractedData.monthly_income) {
      const incomeText = extractedData.annual_income 
        ? `Annual Income ₹${extractedData.annual_income.toLocaleString()}`
        : `Monthly Income ₹${extractedData.monthly_income.toLocaleString()}`
      
      newHighlights.push({
        text: incomeText,
        selector: `.income-highlight`,
        color: '#ef4444',
        reason: 'Extracted income data from PDF'
      })
    }

    if (extractedData.coverage_amount) {
      newHighlights.push({
        text: `Coverage Amount ₹${extractedData.coverage_amount.toLocaleString()}`,
        selector: `.coverage-highlight`,
        color: '#ec4899',
        reason: 'Extracted coverage amount from PDF'
      })
    }

    // Validation issues
    if (validationFlags && validationFlags.length > 0) {
      validationFlags.forEach(flag => {
        if (flag.severity === 'ERROR' && flag.field_name.includes('income') ||
            flag.field_name.includes('age') ||
            flag.field_name.includes('pan') ||
            flag.field_name.includes('email')) {
          newHighlights.push({
            text: flag.field_name.replace(/_/g, ' ').toUpperCase(),
            selector: `.${flag.field_name}-highlight`,
            color: '#ef4444',
            reason: `Validation error: ${flag.message}`
          })
        }
      })
    }

    // Risk assessment indicators
    if (risk && risk.risk_level === 'HIGH') {
      newHighlights.push({
        text: `Risk Level: ${risk.risk_level}`,
        selector: '.risk-highlight',
        color: '#dc2626',
        reason: `High risk assessment: ${risk.explanation}`
      })
    } else if (risk && risk.risk_level === 'MEDIUM') {
      newHighlights.push({
        text: `Risk Level: ${risk.risk_level}`,
        selector: '.risk-medium-highlight',
        color: '#d97706',
        reason: `Medium risk assessment: ${risk.explanation}`
      })
    }

    setHighlights(newHighlights)
  }, [extractedData, validationFlags, risk])

  // Inject highlights into iframe document
  useEffect(() => {
    if (!iframeRef.current || !iframeLoaded) return

    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
    if (!iframeDoc) return

    // Remove existing highlights
    const existingHighlights = iframeDoc.querySelectorAll('.pdf-highlight')
    existingHighlights.forEach(el => el.remove())

    // Add new highlights
    highlights.forEach((highlight, index) => {
      // Create highlight element
      const highlightEl = iframeDoc.createElement('div')
      highlightEl.className = `pdf-highlight ${highlight.selector.substring(1)}`
      highlightEl.style.position = 'absolute'
      highlightEl.style.backgroundColor = highlight.color + '40' // Semi-transparent
      highlightEl.style.border = `2px solid ${highlight.color}`
      highlightEl.style.borderRadius = '4px'
      highlightEl.style.padding = '2px 4px'
      highlightEl.style.fontSize = '12px'
      highlightEl.style.fontWeight = '600'
      highlightEl.style.color = '#fff'
      highlightEl.style.zIndex = '1000'
      highlightEl.title = highlight.reason

      // Try to find the text in the document
      const textNodes = Array.from(iframeDoc.body?.nodeValue?.split('\n') || [])
        .filter(text => text.includes(highlight.text))

      if (textNodes.length > 0) {
        // Create a range to highlight the text
        const range = iframeDoc.createRange()
        const textNode = iframeDoc.createTextNode(highlight.text)
        range.setStart(textNode, 0)
        range.setEnd(textNode, highlight.text.length)

        const span = iframeDoc.createElement('span')
        span.appendChild(textNode)
        Object.assign(span.style, {
          backgroundColor: highlight.color + '40',
          border: `2px solid ${highlight.color}`,
          borderRadius: '4px',
          padding: '2px 4px',
          fontWeight: '600',
          color: '#fff'
        })

        range.surroundContents(span)
      }
    })
  }, [highlights, iframeLoaded])

  const handleIframeLoad = () => {
    setIframeLoaded(true)
  }

  if (!pdfUrl) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-400 text-4xl mb-2">📄</div>
        <p className="text-gray-500">No PDF available</p>
      </div>
    )
  }

  return (
    <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">PDF Document with Highlights</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          {highlights.length} highlights
        </div>
      </div>

      <div className="relative">
        <iframe
          ref={iframeRef}
          src={pdfUrl}
          onLoad={handleIframeLoad}
          className="w-full h-[600px] border-0"
          title="PDF Document"
        />
        {highlights.length > 0 && (
          <div className="absolute top-2 right-2 bg-white border border-gray-200 rounded-lg p-2 shadow-sm z-10">
            <div className="text-xs font-medium text-gray-700 mb-2">Highlight Legend:</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Personal Info</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Email</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Financial Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Validation Issues</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span>High Risk</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {highlights.length > 0 && (
        <div className="bg-blue-50 border-t border-blue-200 px-4 py-2">
          <div className="text-xs text-blue-700">
            <strong>Highlighted Fields:</strong> {highlights.map(h => h.reason).join(' • ')}
          </div>
        </div>
      )}
    </div>
  )
}