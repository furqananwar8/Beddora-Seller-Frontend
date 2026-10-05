'use client'

import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

const Chevron: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={cn('h-4 w-4 shrink-0 text-text-muted', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

interface BaseProps<T> {
  id?: string
  /** The options to show. When `onSearchChange` is given the caller filters (usually server-side); otherwise they are filtered by label here. */
  options: T[]
  getKey: (option: T) => string | number
  getLabel: (option: T) => string
  /** Row content; defaults to the label. */
  renderOption?: (option: T, state: { selected: boolean }) => React.ReactNode
  /** A reason string disables the option and is shown beside it. */
  disabledReason?: (option: T) => string | false | null | undefined
  /** Controlled search for server-side lookup. Debounce in the caller. */
  search?: string
  onSearchChange?: (search: string) => void
  /**
   * Show the search box. Defaults to "only when it helps": always for server-side search,
   * otherwise once there are more than {@link SEARCH_THRESHOLD} options. A short list is just checkboxes.
   */
  searchable?: boolean
  loading?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  error?: string
  disabled?: boolean
  /** Changed-but-not-applied styling (staged filters). */
  highlighted?: boolean
  /** Pinned under the list, e.g. "+ Add new". Receives `close` so it can dismiss the menu. */
  footer?: React.ReactNode | ((close: () => void) => React.ReactNode)
  onOpenChange?: (open: boolean) => void
  className?: string
  triggerClassName?: string
  ariaLabel?: string
}

interface SingleProps<T> extends BaseProps<T> {
  multiple?: false
  value: T | null
  onChange: (value: T) => void
  /** Shown in the trigger instead of the label. */
  renderValue?: (value: T) => React.ReactNode
}

interface MultiProps<T> extends BaseProps<T> {
  multiple: true
  value: T[]
  onChange: (value: T[]) => void
  /** Trigger text for the current selection; defaults to the joined labels. */
  renderValue?: (value: T[]) => React.ReactNode
}

export type SearchableSelectProps<T> = SingleProps<T> | MultiProps<T>

/** Lists this short are scanned faster than searched. */
export const SEARCH_THRESHOLD = 10

/**
 * One searchable dropdown for the whole app: a button that opens a search box and a listbox.
 * Single or multi select, client- or server-side search, disabled options with a reason,
 * and an optional footer slot for "+ Add new". Keyboard: ↑ ↓ to move, Enter to pick, Esc to close.
 */
export function SearchableSelect<T>(props: SearchableSelectProps<T>) {
  const {
    id,
    options,
    getKey,
    getLabel,
    renderOption,
    disabledReason,
    search: controlledSearch,
    onSearchChange,
    searchable,
    loading,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    emptyText = 'No matches.',
    error,
    disabled,
    highlighted,
    footer,
    onOpenChange,
    className,
    triggerClassName,
    ariaLabel,
  } = props

  const [open, setOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState('')
  const [active, setActive] = useState(0)
  const wrapper = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const listId = useId()
  const showSearch = searchable ?? (Boolean(onSearchChange) || options.length > SEARCH_THRESHOLD)

  // Without a search box, focus moves into the list so the arrow keys and Enter still work
  useEffect(() => {
    if (open && !showSearch) list.current?.focus()
  }, [open, showSearch])

  const search = onSearchChange ? (controlledSearch ?? '') : localSearch
  const setSearch = (value: string) => (onSearchChange ? onSearchChange(value) : setLocalSearch(value))

  const visible = useMemo(() => {
    if (onSearchChange) return options
    const needle = localSearch.trim().toLowerCase()
    return needle ? options.filter((option) => getLabel(option).toLowerCase().includes(needle)) : options
  }, [options, onSearchChange, localSearch, getLabel])

  const selectedKeys = useMemo(() => {
    const value = props.value
    if (props.multiple) return new Set((value as T[]).map(getKey))
    return new Set(value ? [getKey(value as T)] : [])
  }, [props.value, props.multiple, getKey])

  const changeOpen = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
    if (next) setActive(0)
  }

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) changeOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const pick = (option: T) => {
    if (disabledReason?.(option)) return
    if (props.multiple) {
      const key = getKey(option)
      const current = props.value
      props.onChange(selectedKeys.has(key) ? current.filter((item) => getKey(item) !== key) : [...current, option])
      return
    }
    props.onChange(option)
    changeOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      changeOpen(false)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, visible.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && visible[active]) {
      event.preventDefault()
      pick(visible[active])
    }
  }

  const triggerText = (() => {
    if (props.multiple) {
      if (props.value.length === 0) return null
      return props.renderValue ? props.renderValue(props.value) : props.value.map(getLabel).join(', ')
    }
    if (!props.value) return null
    return props.renderValue ? props.renderValue(props.value) : getLabel(props.value)
  })()

  return (
    <div ref={wrapper} className={cn('relative min-w-0', className)} onKeyDown={open ? onKeyDown : undefined}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => changeOpen(!open)}
        className={cn(
          'ds-input rounded-lg flex items-center justify-between text-left',
          error ? 'ds-input-error' : highlighted ? 'border-primary-500 ring-1 ring-primary-500' : 'ds-input-default',
          disabled && 'cursor-not-allowed bg-secondary-50 text-text-muted',
          triggerClassName
        )}
      >
        <span className={cn('truncate', triggerText === null && 'text-text-muted')}>{triggerText ?? placeholder}</span>
        <Chevron className="ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[16rem] rounded-lg border border-border bg-surface p-2 shadow-lg">
          {showSearch && (
            <input
              autoFocus
              type="search"
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setActive(0)
              }}
              className="ds-input ds-input-default mb-2 w-full rounded-lg"
            />
          )}
          <ul
            ref={list}
            id={listId}
            role="listbox"
            tabIndex={showSearch ? undefined : -1}
            aria-multiselectable={props.multiple || undefined}
            className="max-h-60 overflow-auto outline-none"
          >
            {visible.map((option, index) => {
              const key = getKey(option)
              const selected = selectedKeys.has(key)
              const reason = disabledReason?.(option) || null
              return (
                <li key={key} role="option" aria-selected={selected} aria-disabled={Boolean(reason) || undefined}>
                  <button
                    type="button"
                    disabled={Boolean(reason)}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pick(option)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm',
                      reason ? 'cursor-not-allowed text-text-muted' : 'hover:bg-secondary-50',
                      index === active && !reason && 'bg-secondary-50',
                      selected && !props.multiple && 'bg-secondary-100'
                    )}
                  >
                    {props.multiple && <input type="checkbox" readOnly tabIndex={-1} checked={selected} disabled={Boolean(reason)} className="h-4 w-4 shrink-0 rounded" />}
                    <span className="min-w-0 flex-1">{renderOption ? renderOption(option, { selected }) : <span className="block truncate">{getLabel(option)}</span>}</span>
                    {reason && <span className="shrink-0 text-xs">{reason}</span>}
                  </button>
                </li>
              )
            })}
            {!loading && visible.length === 0 && <li className="px-2 py-3 text-center text-sm text-text-muted">{emptyText}</li>}
            {loading && <li className="px-2 py-3 text-center text-sm text-text-muted">Searching...</li>}
          </ul>
          {footer && <div className="mt-1 border-t border-border pt-1">{typeof footer === 'function' ? footer(() => changeOpen(false)) : footer}</div>}
        </div>
      )}
    </div>
  )
}
