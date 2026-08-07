'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/dialog/Dialog'
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'

// Generic stat detail shape — not tied to countries
export interface StatDetailItem {
  label: string
  value: number
  currency?: boolean
  percentage?: boolean
  integer?: boolean
}

export interface StatSection {
  title: string
  value: number
  currency?: boolean
  defaultOpen?: boolean
  children?: StatDetailItem[]
}

export interface StatModalData {
  title: string
  flag?: string
  sections: StatSection[]
  summaryRows?: StatDetailItem[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  data: StatModalData | null
  currency: string
}

const Section: React.FC<{
  title: string
  value: React.ReactNode
  children?: React.ReactNode
  defaultOpen?: boolean
}> = ({ title, value, children, defaultOpen = false }) => {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-surface-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={cn('w-4 h-4 text-text-muted transition-transform', open && 'rotate-90')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-text-primary">{title}</span>
        </div>
        <span className="text-sm font-semibold text-text-primary">{value}</span>
      </button>
      {open && children && <div className="pl-6 pr-1 pb-3 space-y-2">{children}</div>}
    </div>
  )
}

const Row: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({
  label,
  value,
  className,
}) => (
  <div className={cn('flex items-center justify-between py-1.5 text-sm', className)}>
    <span className="text-text-secondary">{label}</span>
    <span className={cn('font-medium', className)}>{value}</span>
  </div>
)

export const StatModal: React.FC<Props> = ({ isOpen, onClose, data, currency }) => {
  if (!data) return null

  const fmt = (item: StatDetailItem) => {
    if (item.currency) return formatCurrency(item.value, currency)
    if (item.percentage) return formatPercentage(item.value)
    if (item.integer) return formatNumber(item.value)
    return formatNumber(item.value)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sticky top-0 bg-surface z-10 px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              {data.flag && <span>{data.flag}</span>}
              <span>{data.title}</span>
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-1 hover:bg-surface-secondary rounded transition-colors"
            >
              <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </DialogHeader>

        <div className="px-4 py-2">
          {data.sections.map((section) => (
            <Section
              key={section.title}
              title={section.title}
              value={section.currency ? formatCurrency(section.value, currency) : formatNumber(section.value)}
              defaultOpen={section.defaultOpen}
            >
              {section.children?.map((child) => (
                <Row key={child.label} label={child.label} value={fmt(child)} />
              ))}
            </Section>
          ))}

          {data.summaryRows && (
            <>
              <div className="border-t-2 border-border my-2" />
              {data.summaryRows.map((row) => (
                <Row
                  key={row.label}
                  label={row.label}
                  value={fmt(row)}
                  className={row.label === 'Net profit' ? 'font-semibold text-primary-600' : row.label === 'Gross profit' ? 'font-semibold' : undefined}
                />
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}