import React from 'react'
import { Card } from '@/design-system/cards'

/** One titled card of a long form (Partner, Invoice & shipment, ...). */
export const FormSection: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <Card className="p-4 sm:p-5">
    <h2 className="mb-4 flex flex-wrap items-baseline gap-2 text-base font-semibold text-text-primary">
      {title}
      {note && <span className="text-xs font-normal text-text-muted">{note}</span>}
    </h2>
    {children}
  </Card>
)
