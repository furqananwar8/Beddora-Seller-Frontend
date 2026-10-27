'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'
import { useMenuPosition } from '@/components/searchable-select/useMenuPosition'

export interface ComboboxProps<T> {
  id?: string
  /** The committed text (the form value). */
  value: string
  /** Suggestions for what is typed; the caller filters them. */
  options: T[]
  getKey: (option: T) => string | number
  getLabel: (option: T) => string
  /** Row content; defaults to the label. */
  renderOption?: (option: T) => React.ReactNode
  /** A suggestion was picked. */
  onPick: (option: T) => void
  /** Free text was committed (on blur or Enter): whatever was typed, suggestion or not. */
  onCommit: (text: string) => void
  /** Each keystroke, so the caller can narrow `options`. */
  onInputChange?: (text: string) => void
  loading?: boolean
  placeholder?: string
  emptyText?: string
  error?: string
  disabled?: boolean
  maxLength?: number
  className?: string
}

/**
 * A text box with suggestions: type anything, or pick one of the options shown under it. Unlike
 * {@link SearchableSelect} the typed text is itself the value. Keyboard: ↑ ↓ to move, Enter to pick or keep, Esc to close.
 */
export function Combobox<T>({
  id,
  value,
  options,
  getKey,
  getLabel,
  renderOption,
  onPick,
  onCommit,
  onInputChange,
  loading,
  placeholder,
  emptyText,
  error,
  disabled,
  maxLength,
  className,
}: ComboboxProps<T>) {
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  // -1: nothing highlighted, so Enter keeps the typed text
  const [active, setActive] = useState(-1)
  const wrapper = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const position = useMenuPosition(wrapper, open)
  const listId = useId()

  // A value set from outside (a pick, a restored draft) replaces what is shown
  useEffect(() => setText(value), [value])

  const type = (next: string) => {
    setText(next)
    setActive(-1)
    setOpen(true)
    onInputChange?.(next)
  }

  const commit = () => {
    setOpen(false)
    if (text.trim() !== value) onCommit(text.trim())
  }

  const pick = (option: T) => {
    setOpen(false)
    setText(getLabel(option))
    onPick(option)
  }

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (!wrapper.current?.contains(target) && !menu.current?.contains(target)) commit()
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, text, value])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => Math.min(index + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, -1))
    } else if (event.key === 'Enter') {
      // Never submits the surrounding form
      event.preventDefault()
      if (open && options[active]) pick(options[active])
      else commit()
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapper} className={cn('relative min-w-0', className)}>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        value={text}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => type(event.target.value)}
        onFocus={() => setOpen(true)}
        // Tabbing away keeps the text; clicks outside are handled by the mousedown listener
        onBlur={(event) => {
          if (!menu.current?.contains(event.relatedTarget as Node)) commit()
        }}
        onKeyDown={onKeyDown}
        className={cn('ds-input rounded-lg', error ? 'ds-input-error' : 'ds-input-default', disabled && 'cursor-not-allowed bg-secondary-50 text-text-muted')}
      />

      {open &&
        position &&
        (loading || options.length > 0 || emptyText) &&
        createPortal(
          <div ref={menu} style={{ ...position, zIndex: 10000 }} className="fixed min-w-[16rem] rounded-lg border border-border bg-surface p-2 shadow-lg">
            <ul id={listId} role="listbox" className="max-h-60 overflow-auto outline-none">
              {options.map((option, index) => (
                <li key={getKey(option)} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    tabIndex={-1}
                    // Keeps focus in the input so its blur does not commit the half-typed text first
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pick(option)}
                    className={cn('flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-secondary-50', index === active && 'bg-secondary-50')}
                  >
                    <span className="min-w-0 flex-1">{renderOption ? renderOption(option) : <span className="block truncate">{getLabel(option)}</span>}</span>
                  </button>
                </li>
              ))}
              {!loading && options.length === 0 && emptyText && <li className="px-2 py-3 text-center text-sm text-text-muted">{emptyText}</li>}
              {loading && <li className="px-2 py-3 text-center text-sm text-text-muted">Searching...</li>}
            </ul>
          </div>,
          document.body
        )}
    </div>
  )
}
