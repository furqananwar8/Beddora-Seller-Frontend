import React from 'react'
import { cn } from '@/utils/cn'

/**
 * Presentational building blocks for the allocation drawer, styled to its
 * canvas design. The app resets border-radius globally, so the rounded corners
 * the design calls for use Tailwind's important modifier (`!rounded-*`).
 */

type ButtonVariant = 'primary' | 'secondary'

export const DrawerButton = ({
  variant = 'secondary',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; isLoading?: boolean }) => (
  <button
    type="button"
    disabled={disabled || isLoading}
    className={cn(
      'inline-flex items-center justify-center gap-2 h-11 px-[18px] !rounded-lg border text-sm font-medium transition-colors',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      variant === 'primary'
        ? 'bg-primary-600 border-primary-600 text-text-inverse hover:opacity-90'
        : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50',
      className
    )}
    {...props}
  >
    {isLoading && (
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    )}
    {children}
  </button>
)

type TileTone = 'neutral' | 'amber' | 'blue' | 'green'

const TILE_TONE: Record<TileTone, { box: string; label: string; value: string }> = {
  neutral: { box: 'border-slate-200 bg-white', label: 'text-slate-600', value: 'text-slate-900' },
  amber: { box: 'border-dashed border-amber-600 bg-amber-50', label: 'text-amber-800', value: 'text-amber-900' },
  blue: { box: 'border-blue-200 bg-blue-50', label: 'text-blue-800', value: 'text-blue-900' },
  green: { box: 'border-emerald-200 bg-emerald-50', label: 'text-emerald-800', value: 'text-emerald-900' },
}

export const Tile = ({ label, value, suffix, tone = 'neutral' }: { label: string; value: React.ReactNode; suffix?: string; tone?: TileTone }) => {
  const t = TILE_TONE[tone]
  return (
    <div className={cn('px-4 py-3.5 border !rounded-[10px] flex flex-col gap-1', t.box)}>
      <span className={cn('text-[13px]', t.label)}>{label}</span>
      <span className={cn('text-2xl font-semibold', t.value)}>
        {value}
        {suffix && <span className="text-sm font-medium text-slate-600"> · {suffix}</span>}
      </span>
    </div>
  )
}

export const Chip = ({ tone = 'amber', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'amber' | 'red' }) => (
  <button
    type="button"
    className={cn(
      'h-8 px-3 !rounded-md border bg-white text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed',
      tone === 'amber' ? 'border-amber-600 text-amber-800 hover:bg-amber-50' : 'border-red-700 text-red-800 hover:bg-red-50',
      className
    )}
    {...props}
  />
)

export const Switch = ({ on, disabled, label, onChange }: { on: boolean; disabled?: boolean; label: string; onChange: (on: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!on)}
    className={cn(
      'relative w-9 h-5 !rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
      on ? 'bg-primary-600' : 'bg-slate-300'
    )}
  >
    <span className={cn('absolute top-0.5 w-4 h-4 !rounded-full bg-white transition-all', on ? 'left-[18px]' : 'left-0.5')} />
  </button>
)

export const Notice = ({ tone, title, children }: { tone: 'blue' | 'neutral' | 'red' | 'green'; title: string; children: React.ReactNode }) => {
  const styles = {
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    red: 'border-red-300 bg-red-50 text-red-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }[tone]
  return (
    <div className={cn('flex flex-col gap-1.5 px-4 py-3.5 border !rounded-[10px] text-sm', styles)}>
      <span className="font-semibold">{title}</span>
      <div>{children}</div>
    </div>
  )
}

/** Rounded table frame used by the channels, review and result steps. */
export const TableFrame = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('border border-slate-200 !rounded-xl overflow-hidden overflow-x-auto', className)}>{children}</div>
)

export const TH = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('px-4 py-3 text-xs font-semibold text-slate-700 bg-slate-100 border-b border-slate-200 text-left', className)} {...props} />
)

export const TD = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-4 py-3.5 border-b border-slate-200 align-middle', className)} {...props} />
)

export const ProductCell = ({ title, sku, note, noteClass }: { title: string; sku: string; note?: string; noteClass?: string }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <span className="text-sm font-semibold text-slate-900 truncate max-w-[280px]" title={title}>
      {title}
    </span>
    <span className="font-mono text-xs text-slate-600">{sku}</span>
    {note && <span className={cn('text-[13px]', noteClass ?? 'text-slate-600')}>{note}</span>}
  </div>
)
