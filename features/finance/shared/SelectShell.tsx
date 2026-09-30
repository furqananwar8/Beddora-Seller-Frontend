import React from 'react'
import { cn } from '@/utils/cn'

/** The chevron used by the app's date range picker, so every dropdown in finance looks the same. */
export const Chevron: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={cn('h-4 w-4 shrink-0 text-text-muted', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

/**
 * Wraps a native <select> (give it `appearance-none pr-9`, see `selectClass`) and overlays the shared chevron
 * in place of the browser's bold arrow.
 */
export const SelectShell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('relative', className)}>
    {children}
    <Chevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
  </div>
)
