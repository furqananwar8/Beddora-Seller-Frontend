import React from 'react'
import { cn } from '@/utils/cn'

interface SectionCardProps {
  title: React.ReactNode
  /** Muted text after the title. */
  subtitle?: React.ReactNode
  /** Right side of the header (a toggle, a sort select, a count). */
  aside?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/** A titled white card: the building block of the shipping screens. */
export const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, aside, className, children }) => (
  <section className={cn('rounded-lg border border-border bg-surface p-4 shadow-sm', className)}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-text-primary">
        {title}
        {subtitle && <span className="font-normal text-text-muted"> · {subtitle}</span>}
      </h3>
      {aside}
    </div>
    {children}
  </section>
)
