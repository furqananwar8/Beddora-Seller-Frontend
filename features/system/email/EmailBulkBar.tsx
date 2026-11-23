import React from 'react'

interface EmailBulkBarProps {
  /** "3 selected". */
  summary: React.ReactNode
  /** The buttons and links of the bar. */
  children: React.ReactNode
  note?: string
}

/** The dark bar above a table while rows are ticked: what is selected, one action for all of them, and a note. */
export const EmailBulkBar: React.FC<EmailBulkBarProps> = ({ summary, children, note }) => (
  <div role="region" aria-label="Selected rows" className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-secondary-900 px-4 py-2 text-sm text-white">
    <strong>{summary}</strong>
    {children}
    {note && <span className="ml-auto text-xs text-white/75">{note}</span>}
  </div>
)

/** A text link inside the bar. */
export const BulkLink: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="text-xs text-sky-300 underline hover:text-sky-200">
    {children}
  </button>
)
