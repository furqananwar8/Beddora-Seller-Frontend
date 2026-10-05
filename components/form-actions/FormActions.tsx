import React from 'react'

/** The form's buttons (Cancel, Save, ...), always at the bottom: right-aligned on desktop, full width on phones. */
export const FormActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">{children}</div>
)
