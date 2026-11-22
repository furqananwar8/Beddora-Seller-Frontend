import React from 'react'

/** A column title with its "(units)" note on the next line, so a narrow column does not cut it off. */
export const columnHeading = (title: string): React.ReactNode => {
  const at = title.indexOf(' (')
  if (at === -1) return title
  return (
    <>
      {title.slice(0, at)}
      <br />
      {title.slice(at + 1)}
    </>
  )
}
