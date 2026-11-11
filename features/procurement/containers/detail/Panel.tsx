'use client'

import React, { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { cn } from '@/utils/cn'

interface PanelProps {
  title: string
  /** Shown as a pill next to the title, e.g. how many items the panel lists. */
  count?: number
  action?: React.ReactNode
  className?: string
  /** Classes of the content area (e.g. to clip it to a fixed height). */
  bodyClassName?: string
  /** Pinned under the content, outside the clipped area. */
  footer?: React.ReactNode
  children: React.ReactNode
}

/** One titled column of the container page. */
export const Panel: React.FC<PanelProps> = ({ title, count, action, className, bodyClassName, footer, children }) => (
  <section className={cn('flex min-w-0 flex-col rounded-lg border border-border bg-surface shadow-sm', className)}>
    <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-primary">
        {title}
        {count !== undefined && <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-xs font-medium normal-case text-secondary-700">{count}</span>}
      </h2>
      {action}
    </header>
    <div className={cn('flex flex-1 flex-col gap-3 p-4', bodyClassName)}>{children}</div>
    {footer}
  </section>
)

interface ExpandablePanelProps extends Omit<PanelProps, 'children' | 'footer' | 'bodyClassName'> {
  /** The major stats, shown by default; clipped to the panel's fixed height. */
  summary: React.ReactNode
  /** Title of the modal that holds the full detail (children). */
  modalTitle: string
  /** False when there is nothing more than the summary shows (hides the More button). */
  hasMore?: boolean
  /** The full detail, shown in a modal when "More" is clicked. */
  children: React.ReactNode
}

/**
 * A fixed-height panel of a container's overview: major stats by default, the full detail behind "More" in a modal,
 * so the row of panels under an expanded container stays short however much it holds.
 */
export const ExpandablePanel: React.FC<ExpandablePanelProps> = ({ summary, modalTitle, hasMore = true, children, className, ...panel }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Panel
        {...panel}
        className={cn('h-[23rem]', className)}
        bodyClassName="min-h-0 overflow-hidden"
        footer={
          hasMore ? (
            <div className="border-t border-border px-4 py-2">
              <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setOpen(true)}>
                More
              </Button>
            </div>
          ) : null
        }
      >
        {summary}
      </Panel>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={modalTitle} size="xl">
        <div className="flex flex-col gap-3">{children}</div>
      </Modal>
    </>
  )
}

/** An empty panel's message. */
export const PanelEmpty: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="py-6 text-center text-sm text-text-muted">{children}</p>

/** A label over a value, for compact facts inside cards. */
export const Fact: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <div className={cn('min-w-0', className)}>
    <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
    <p className="truncate text-sm text-text-primary">{children ?? '—'}</p>
  </div>
)
