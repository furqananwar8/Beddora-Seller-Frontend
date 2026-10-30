import React from 'react'

interface WizardFooterProps {
  /** Left side: Back / Cancel. */
  start: React.ReactNode
  /** Why the main button is disabled, or what is selected. */
  hint?: React.ReactNode
  /** Right side: the step's main button. */
  children: React.ReactNode
}

/** The bar under each wizard step. */
export const WizardFooter: React.FC<WizardFooterProps> = ({ start, hint, children }) => (
  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
    {start}
    <div className="flex flex-wrap items-center justify-end gap-3">
      {hint && <span className="text-sm text-text-muted">{hint}</span>}
      {children}
    </div>
  </div>
)
