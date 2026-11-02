import React from 'react'
import { FormActions } from '@/components/form-actions/FormActions'

interface WizardFooterProps {
  /** Back / Cancel, before the main button. */
  start: React.ReactNode
  /** Why the main button is disabled, or what is selected. */
  hint?: React.ReactNode
  /** The step's main button. */
  children: React.ReactNode
}

/** The bar under each wizard step: the app's form actions (right-aligned, full width on phones), with an optional hint. */
export const WizardFooter: React.FC<WizardFooterProps> = ({ start, hint, children }) => (
  <div className="mt-4 space-y-2 border-t border-border pt-4">
    {hint && <p className="text-right text-sm text-text-muted">{hint}</p>}
    <FormActions>
      {start}
      {children}
    </FormActions>
  </div>
)
