'use client'

import { isPlainObject, isSafeLink } from './barcodeContent'

/** One label/value row; `value` is any JSON value and is shown according to its type. */
export function ValueRow({ label, value, depth = 0 }: { label: string; value: unknown; depth?: number }) {
  const nested = isPlainObject(value) || Array.isArray(value)

  if (nested) {
    const entries: [string, unknown][] = Array.isArray(value)
      ? value.map((item, index) => [`#${index + 1}`, item])
      : Object.entries(value as Record<string, unknown>)

    return (
      <div className="space-y-1.5">
        <div className="text-sm text-text-muted">
          {label}
          {Array.isArray(value) && <span className="ml-1 text-xs">({entries.length})</span>}
        </div>
        {entries.length === 0 ? (
          <div className="pl-3 text-sm text-text-muted">empty</div>
        ) : (
          <div className="space-y-1.5 border-l border-border pl-3">
            {entries.map(([key, item]) => (
              <ValueRow key={key} label={key} value={item} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="break-all text-right font-medium text-text-primary">
        <Scalar value={value} />
      </span>
    </div>
  )
}

function Scalar({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-text-muted">null</span>
  if (typeof value === 'boolean') return <>{value ? 'true' : 'false'}</>
  if (isSafeLink(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">
        {value}
      </a>
    )
  }
  return <>{String(value)}</>
}

/** Every entry of an object or array as rows (a top-level array is listed by position). */
export function ValueRows({ value }: { value: unknown }) {
  const entries: [string, unknown][] = Array.isArray(value)
    ? value.map((item, index) => [`#${index + 1}`, item])
    : isPlainObject(value)
      ? Object.entries(value)
      : [['value', value]]

  return (
    <>
      {entries.map(([key, item]) => (
        <ValueRow key={key} label={key} value={item} />
      ))}
    </>
  )
}
