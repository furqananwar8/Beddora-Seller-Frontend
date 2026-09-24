"use client"

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'
import { DeliveryWindow, InboundShipment, ShipmentStatus } from './types'
import { STATUS_META, WORKFLOW_STEPS, getActiveStepIndex } from './workflow'

export const formatUnits = (n: number) => new Intl.NumberFormat('en-US').format(n)

export const formatShortDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(iso)
  )

export const formatWindow = (w?: DeliveryWindow) =>
  w ? `${formatShortDate(w.start)} – ${formatShortDate(w.end)}` : '—'

export const formatRelative = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return days < 30 ? `${days}d ago` : formatShortDate(iso)
}

export const StatusBadge: React.FC<{ status: ShipmentStatus }> = ({ status }) => {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        meta.className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dotClassName)} />
      {meta.label}
    </span>
  )
}

export const ProductThumb: React.FC<{ src?: string; alt: string; size?: 'sm' | 'md' }> = ({
  src,
  alt,
  size = 'md',
}) => {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  return (
    <div className={cn('flex flex-shrink-0 items-center justify-center rounded bg-secondary-100', dim)}>
      {src ? (
        <img src={src} alt={alt} className={cn('rounded object-cover', dim)} />
      ) : (
        <svg className="h-5 w-5 text-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m-8-10l8 4m0 0v10m0-10L4 7" />
        </svg>
      )}
    </div>
  )
}

/** Compact "3 / 7" progress used in the collapsed row. */
export const StageProgress: React.FC<{ shipment: InboundShipment }> = ({ shipment }) => {
  const active = getActiveStepIndex(shipment)
  const total = WORKFLOW_STEPS.length
  const done = Math.min(active, total)
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5" aria-hidden>
        {WORKFLOW_STEPS.map((step, i) => (
          <span
            key={step.key}
            className={cn(
              'h-1.5 w-3 rounded-full',
              i < done ? 'bg-secondary-800' : i === active ? 'bg-warning-400' : 'bg-secondary-200'
            )}
          />
        ))}
      </div>
      <span className="text-xs text-text-muted">
        {done}/{total}
      </span>
    </div>
  )
}

/** Full horizontal stepper used in the expanded panel. */
export const WorkflowStepper: React.FC<{ shipment: InboundShipment }> = ({ shipment }) => {
  const active = getActiveStepIndex(shipment)
  const cancelled = shipment.status === 'cancelled'
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1">
      {WORKFLOW_STEPS.map((step, i) => {
        const done = !cancelled && i < active
        const current = !cancelled && i === active
        return (
          <li key={step.key} className="flex min-w-0 items-center gap-1">
            <div
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium',
                done && 'border-secondary-800 bg-secondary-800 text-white',
                current && 'border-warning-300 bg-warning-50 text-warning-800',
                !done && !current && 'border-border bg-surface text-text-muted'
              )}
              aria-current={current ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full text-[10px]',
                  done ? 'bg-white/20' : current ? 'bg-warning-200' : 'bg-secondary-100'
                )}
              >
                {done ? '✓' : i + 1}
              </span>
              {step.label}
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <span className={cn('h-px w-4 flex-shrink-0', done ? 'bg-secondary-800' : 'bg-border')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    className={cn('h-4 w-4 transition-transform', open ? 'rotate-180' : 'rotate-0')}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

/**
 * Dropdown rendered in a portal with fixed positioning, so it isn't clipped by
 * the table's overflow container. Closes on outside click, scroll, resize, Esc.
 */
export const FloatingMenu: React.FC<{
  anchorRef: React.RefObject<HTMLElement>
  open: boolean
  onClose: () => void
  width?: number
  className?: string
  children: React.ReactNode
}> = ({ anchorRef, open, onClose, width = 208, className, children }) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const menuHeight = menuRef.current?.offsetHeight ?? 0
    const fitsBelow = rect.bottom + 4 + menuHeight <= window.innerHeight
    setPos({
      top: fitsBelow ? rect.bottom + 4 : Math.max(8, rect.top - 4 - menuHeight),
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    })
  }, [open, anchorRef, width])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !anchorRef.current?.contains(t)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [open, onClose, anchorRef])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
      className={cn('z-[60] rounded-md border border-border bg-surface py-1 shadow-lg', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  )
}
