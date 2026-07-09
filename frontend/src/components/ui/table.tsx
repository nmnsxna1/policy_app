import { cn } from '../../lib/utils'
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto border border-[var(--border)] rounded-xl">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('[&_tr]:border-b border-[var(--border)] bg-[var(--bg-secondary)]', className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-secondary)] data-[state=selected]:bg-[var(--bg-secondary)]', className)} {...props}>
      {children}
    </tr>
  )
}

export function TableHead({ className, children, ...props }: ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return (
    <th className={cn('h-10 px-4 text-left align-middle font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider', className)} {...props}>
      {children}
    </th>
  )
}

export function TableCell({ className, children, ...props }: TdHTMLAttributes<HTMLTableDataCellElement>) {
  return (
    <td className={cn('p-4 align-middle text-sm text-[var(--text-primary)]', className)} {...props}>
      {children}
    </td>
  )
}
