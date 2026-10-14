import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
} from 'react'

export interface MultiSelectOption {
  id: string
  name: string
  /** Optional colour dot shown before the name (always paired with the name, never colour alone). */
  color?: string
  /** Optional sub-line shown under the name. */
  description?: string
  /** Tone of the sub-line. Defaults to muted. */
  descriptionTone?: 'muted' | 'warning'
  /** Keep this option out of the "All" toggle and the "all selected" state. */
  excludeFromAll?: boolean
  /** Draw a divider above this option. */
  separatorBefore?: boolean
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  title: string
  placeholder?: string
  className?: string
  single?: boolean
  /** Label of the "All" row. Defaults to `All {title}s`. */
  allLabel?: string
  /** Minimum number of selected options; deselecting below it is ignored. Defaults to 0. */
  minSelected?: number
  /** Custom trigger content. Receives the selected options. Defaults to the built-in text label. */
  renderValue?: (selected: MultiSelectOption[], allSelected: boolean) => React.ReactNode
  /** Extra content rendered below the options inside the dropdown panel. */
  footer?: React.ReactNode
  /** Extra classes for the dropdown panel. */
  panelClassName?: string
}

export const MultiSelectInput: React.FC<
  MultiSelectProps
> = ({
  options,
  value,
  onChange,
  title,
  placeholder,
  className = '',
  single = false,
  allLabel,
  minSelected = 0,
  renderValue,
  footer,
  panelClassName = '',
}) => {
  const [open, setOpen] =
    useState<boolean>(false)

  const dropdownRef =
    useRef<HTMLDivElement>(null)

  const allIds = useMemo(
    () =>
      options
        .filter(
          (option) =>
            !option.excludeFromAll
        )
        .map(
          (option) => option.id
        ),
    [options]
  )

  /*
   * A value of [] means "nothing is currently
   * selected in the draft UI".
   *
   * The parent decides whether [] means "ALL"
   * when the user actually applies the filters.
   */

  const allSelected =
  allIds.length > 0 &&
  allIds.every((id) =>
    value.includes(id)
  )

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener(
        'mousedown',
        handleClickOutside
      )

      return () =>
        document.removeEventListener(
          'mousedown',
          handleClickOutside
        )
    }
  }, [open])

  const toggleSingle = (
    id: string
  ) => {
    onChange([id])
    setOpen(false)
  }

  const toggleOne = (
    id: string
  ) => {
    if (value.includes(id)) {
      if (value.length <= minSelected) {
        return
      }
      onChange(
        value.filter(
          (item) => item !== id
        )
      )
    } else {
      onChange([
        ...value,
        id,
      ])
    }
  }

  const toggleAll = () => {
    /*
     * If everything is currently selected,
     * unselect everything.
     *
     * This intentionally produces [].
     *
     * The parent will convert [] -> ALL_MARKETPLACES
     * when Apply Filters is pressed.
     */
    if (allSelected) {
      if (minSelected > 0) {
        return
      }
      onChange([])
      return
    }

    /*
     * Otherwise explicitly select every option.
     */
    onChange([...allIds])
  }

  const displayLabel =
    useMemo(() => {
      if (value.length === 0) {
        return (
          placeholder ||
          `Select ${title.toLowerCase()}`
        )
      }

      if (single) {
        return (
          options.find(
            (option) =>
              option.id === value[0]
          )?.name ||
          placeholder ||
          `Select ${title.toLowerCase()}`
        )
      }

      if (value.length === 1) {
        return (
          options.find(
            (option) =>
              option.id === value[0]
          )?.name ||
          placeholder ||
          `Select ${title.toLowerCase()}`
        )
      }

      /*
       * Use allSelected instead of simply comparing
       * lengths. This is safer if options ever change.
       */
      if (allSelected) {
        return `All ${title}s`
      }

      return `${value.length} selected`
    }, [
      value,
      options,
      placeholder,
      title,
      single,
      allSelected,
    ])

  return (
    <div
      className={`relative min-w-[160px] ${className}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
      >
        <span className="truncate">
          {renderValue
            ? renderValue(
                options.filter(
                  (option) =>
                    value.includes(
                      option.id
                    )
                ),
                allSelected
              )
            : displayLabel}
        </span>

        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${
            open
              ? 'rotate-180'
              : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className={`absolute z-50 mt-1 w-full min-w-[200px] bg-surface border border-border rounded-lg shadow-lg py-1 ${panelClassName}`}>
          {!single && (
            <label className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border cursor-pointer hover:bg-surface-secondary">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                checked={
                  allSelected
                }
                onChange={
                  toggleAll
                }
              />

              <span className="text-sm font-medium text-text-primary">
                {allLabel ??
                  `All ${title}s`}
              </span>
            </label>
          )}

          {options.map(
            (option) => {
              const isSelected =
                value.includes(
                  option.id
                )

              return (
                <div
                  key={option.id}
                  className={
                    option.separatorBefore
                      ? 'border-t border-border mt-1 pt-1'
                      : undefined
                  }
                >
                <div
                  onClick={() =>
                    single
                      ? toggleSingle(
                          option.id
                        )
                      : toggleOne(
                          option.id
                        )
                  }
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-secondary"
                >
                  {single ? (
                    isSelected ? (
                      <svg
                        className="w-4 h-4 text-success-600 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <div className="w-4 h-4 flex-shrink-0" />
                    )
                  ) : (
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                      checked={
                        isSelected
                      }
                      onChange={() =>
                        toggleOne(
                          option.id
                        )
                      }
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    />
                  )}

                  {option.color && (
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          option.color,
                      }}
                    />
                  )}

                  <span className="min-w-0">
                    <span
                      className={`block text-sm ${
                        isSelected
                          ? 'font-medium text-text-primary'
                          : 'text-text-primary'
                      }`}
                    >
                      {
                        option.name
                      }
                    </span>
                    {option.description && (
                      <span
                        className={`block text-xs ${
                          option.descriptionTone ===
                          'warning'
                            ? 'text-warning-600'
                            : 'text-text-muted'
                        }`}
                      >
                        {
                          option.description
                        }
                      </span>
                    )}
                  </span>
                </div>
                </div>
              )
            }
          )}

          {footer}
        </div>
      )}
    </div>
  )
}

export default MultiSelectInput