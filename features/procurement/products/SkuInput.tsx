'use client'

import React, { useState } from 'react'
import { fieldClass } from '@/components/form-field/FormField'
import { useLazyCheckPoProductSkuQuery } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'

type Status = 'idle' | 'checking' | 'free' | 'taken'

interface SkuInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onBlur'> {
  error?: string
  /** The family being edited, whose own SKUs do not count as taken. */
  productId?: number
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  /** Reports a taken SKU so the form can show it as a field error. */
  onTaken?: (sku: string) => void
  compact?: boolean
}

/** SKU box that checks uniqueness (across masters and variations) when it loses focus. */
export const SkuInput = React.forwardRef<HTMLInputElement, SkuInputProps>(({ error, productId, onBlur, onTaken, compact, className, onChange, ...props }, ref) => {
  const [status, setStatus] = useState<Status>('idle')
  const [check] = useLazyCheckPoProductSkuQuery()

  const verify = async (raw: string) => {
    const sku = raw.trim().toUpperCase()
    if (!sku) return setStatus('idle')
    setStatus('checking')
    try {
      const result = await check({ sku, productId }, true).unwrap()
      setStatus(result.available ? 'free' : 'taken')
      if (!result.available) onTaken?.(sku)
    } catch {
      // A failed check is not a verdict; the save validates again
      setStatus('idle')
    }
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        autoComplete="off"
        spellCheck={false}
        className={cn(fieldClass(error), 'font-mono uppercase', compact ? 'pr-8' : 'pr-20', className)}
        onChange={(event) => {
          setStatus('idle')
          onChange?.(event)
        }}
        onBlur={(event) => {
          onBlur?.(event)
          void verify(event.target.value)
        }}
        {...props}
      />
      {status !== 'idle' && !error && (
        <span
          className={cn('pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium', status === 'free' ? 'text-success-700' : status === 'taken' ? 'text-danger-600' : 'text-text-muted')}
          aria-live="polite"
        >
          {status === 'checking' ? '…' : status === 'free' ? (compact ? '✓' : '✓ Unique') : compact ? '!' : 'Taken'}
        </span>
      )}
    </div>
  )
})
SkuInput.displayName = 'SkuInput'
