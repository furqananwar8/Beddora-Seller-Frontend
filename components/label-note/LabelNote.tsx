import React from 'react'

/** A label ending in a bracketed note: `Cartons (Received / Short)` -> the label, and the note. */
const TRAILING_NOTE = /^(.*\S)\s*(\([^()]+\))$/

interface LabelNoteProps {
  children: React.ReactNode
  /** Goes straight after the label itself (a required star), before the note. */
  suffix?: React.ReactNode
}

/**
 * Shows a bracketed note under its label instead of beside it: `Cartons` with `(Received / Short)` on the line
 * below. Anything that is not a plain text label with a trailing bracket is shown as it is.
 */
export const LabelNote: React.FC<LabelNoteProps> = ({ children, suffix }) => {
  const match = typeof children === 'string' ? TRAILING_NOTE.exec(children) : null
  if (!match) {
    return (
      <>
        {children}
        {suffix}
      </>
    )
  }
  return (
    <>
      <span>
        {match[1]}
        {suffix}
      </span>
      <span className="block text-[0.7rem] font-normal normal-case tracking-normal text-text-muted">{match[2]}</span>
    </>
  )
}
