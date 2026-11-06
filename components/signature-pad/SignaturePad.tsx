'use client'

import React, { useEffect, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/design-system/buttons'
import { cn } from '@/utils/cn'

interface SignaturePadProps {
  /** PNG data URL of what is drawn; '' when the pad is empty. */
  value: string
  onChange: (value: string) => void
  /** Shown under the pad when the signature is missing or invalid. */
  error?: string
  disabled?: boolean
  className?: string
}

/** Draw-your-signature box with a reset button. The drawing is reported as a PNG data URL on every stroke. */
export const SignaturePad: React.FC<SignaturePadProps> = ({ value, onChange, error, disabled, className }) => {
  const pad = useRef<SignatureCanvas>(null)

  // The canvas bitmap must match its on-screen size or strokes land off the pointer; an existing signature (the one
  // saved with a receipt) is drawn back on after sizing
  const latest = useRef(value)
  latest.current = value
  useEffect(() => {
    const fit = () => {
      const signature = pad.current
      const canvas = signature?.getCanvas()
      if (!signature || !canvas || canvas.clientWidth === 0) return
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.clientWidth * ratio
      canvas.height = canvas.clientHeight * ratio
      canvas.getContext('2d')?.scale(ratio, ratio)
      signature.clear()
      if (latest.current) signature.fromDataURL(latest.current, { width: canvas.clientWidth, height: canvas.clientHeight })
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const reset = () => {
    pad.current?.clear()
    onChange('')
  }

  return (
    <div className={className}>
      <div className={cn('relative overflow-hidden rounded-lg border bg-surface', error ? 'border-danger-500' : 'border-border')}>
        <SignatureCanvas
          ref={pad}
          penColor="#111827"
          canvasProps={{ className: cn('h-40 w-full touch-none', disabled && 'pointer-events-none opacity-60'), 'aria-label': 'Signature' }}
          onEnd={() => onChange(pad.current && !pad.current.isEmpty() ? pad.current.getCanvas().toDataURL('image/png') : '')}
        />
        {!value && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-text-muted">Sign here</span>}
        <span className="pointer-events-none absolute inset-x-4 bottom-8 border-b border-dashed border-border" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {error ? <p className="text-xs text-danger-600">{error}</p> : <span />}
        <Button type="button" size="sm" variant="outline" onClick={reset} disabled={disabled || !value}>
          Reset
        </Button>
      </div>
    </div>
  )
}
