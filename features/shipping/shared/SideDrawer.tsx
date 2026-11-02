'use client'

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Spinner } from '@/design-system/loaders'

interface SideDrawerProps {
  /** Drawers render nothing while closed. */
  open: boolean
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Escape is ignored while false, e.g. when a dialog is open on top of the drawer. */
  closeOnEscape?: boolean
  onClose: () => void
  /** Shown as a spinner or an error in place of the body. */
  state?: 'loading' | 'error' | 'ready'
  errorMessage?: string
  /** Rendered outside the panel, e.g. dialogs opened from the drawer. */
  overlays?: React.ReactNode
  children: React.ReactNode
}

/** A panel sliding in from the right over a dimmed page; the shell every shipping drawer shares. */
export const SideDrawer: React.FC<SideDrawerProps> = ({ open, title, subtitle, closeOnEscape = true, onClose, state = 'ready', errorMessage = 'Could not load this.', overlays, children }) => {
  useEffect(() => {
    if (!open || !closeOnEscape) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeOnEscape, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby="side-drawer-title">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <h2 id="side-drawer-title" className="truncate text-lg font-bold text-text-primary">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-text-muted hover:bg-secondary-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {state === 'loading' ? (
          <div className="flex justify-center p-10">
            <Spinner size="sm" />
          </div>
        ) : state === 'error' ? (
          <p className="p-8 text-center text-sm text-danger-600">{errorMessage}</p>
        ) : (
          children
        )}
      </aside>
      {overlays}
    </div>,
    document.body
  )
}

export const DrawerSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="border-t border-border px-5 py-4">
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
    {children}
  </section>
)

/** A label/value grid; fill it with DrawerDetail rows. */
export const DrawerDetails: React.FC<{ children: React.ReactNode }> = ({ children }) => <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">{children}</dl>

export const DrawerDetail: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <>
    <dt className="text-text-muted">{label}</dt>
    <dd className="text-text-primary">{children}</dd>
  </>
)
