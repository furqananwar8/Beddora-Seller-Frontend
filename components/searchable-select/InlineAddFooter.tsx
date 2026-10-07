'use client'

import React, { useState } from 'react'

interface InlineAddFooterProps {
  /** The noun being added, e.g. "category" → "+ Add category", "Category name". */
  noun: string
  /** Saves the name; resolves to an error message to show, or `null` when it worked. */
  onAdd: (name: string) => Promise<string | null> | string | null
  /** Dismisses the menu once added (the `close` a {@link SearchableSelect} footer receives). */
  close: () => void
  busy?: boolean
  maxLength?: number
}

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

/**
 * "+ Add …" pinned under a {@link SearchableSelect} list: a link that turns into a name box with an Add button.
 * The menu unmounts it on close, so a half-typed name never lingers.
 */
export const InlineAddFooter: React.FC<InlineAddFooterProps> = ({ noun, onAdd, close, busy, maxLength = 60 }) => {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return setError('Enter a name')
    const problem = await onAdd(trimmed)
    if (problem) return setError(problem)
    close()
  }

  if (!adding) {
    return (
      <button type="button" onClick={() => setAdding(true)} className="block w-full rounded-md px-2 pb-1 pt-2 text-left text-sm font-medium text-primary-600 hover:underline">
        + Add {noun}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1 px-1 pb-1 pt-2">
      <div className="flex gap-2">
        <input
          autoFocus
          aria-label={`New ${noun} name`}
          value={name}
          maxLength={maxLength}
          onChange={(event) => {
            setName(event.target.value)
            setError(null)
          }}
          onKeyDown={(event) => {
            // Enter here adds the name instead of picking a list option
            if (event.key === 'Enter') {
              event.preventDefault()
              event.stopPropagation()
              void submit()
            }
          }}
          className="ds-input ds-input-default min-w-0 flex-1 rounded-lg"
          placeholder={`${capitalize(noun)} name`}
        />
        <button type="button" onClick={() => void submit()} disabled={busy} className="ds-button ds-button-primary ds-button-sm shrink-0">
          Add
        </button>
      </div>
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  )
}
