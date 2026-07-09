const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  UPLOADED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  AI_PROCESSED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  CORRECTION_REQUIRED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  READY_TO_SUBMIT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  PENDING_PM_REVIEW: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  ESCALATED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  WITHDRAWN: 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
