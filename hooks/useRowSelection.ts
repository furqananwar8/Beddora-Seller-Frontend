import { useCallback, useMemo, useState } from 'react'

/**
 * Ticked rows of a table, by key. `visibleKeys` are the rows on screen (the current page): "select all"
 * acts on them, and the header checkbox reads all, some or none of them.
 */
export function useRowSelection<K extends string | number>(visibleKeys: K[]) {
  const [selected, setSelected] = useState<ReadonlySet<K>>(new Set())

  const toggle = useCallback(
    (key: K) =>
      setSelected((current) => {
        const next = new Set(current)
        if (!next.delete(key)) next.add(key)
        return next
      }),
    []
  )

  const visibleSelected = visibleKeys.filter((key) => selected.has(key)).length
  const allVisible = visibleKeys.length > 0 && visibleSelected === visibleKeys.length

  const toggleAllVisible = useCallback(
    () =>
      setSelected((current) => {
        const next = new Set(current)
        if (visibleKeys.every((key) => next.has(key))) visibleKeys.forEach((key) => next.delete(key))
        else visibleKeys.forEach((key) => next.add(key))
        return next
      }),
    [visibleKeys]
  )

  const clear = useCallback(() => setSelected(new Set()), [])
  const keys = useMemo(() => [...selected], [selected])

  return {
    isSelected: (key: K) => selected.has(key),
    toggle,
    toggleAllVisible,
    clear,
    keys,
    count: selected.size,
    /** For the header checkbox. */
    headerState: allVisible ? ('all' as const) : visibleSelected > 0 ? ('some' as const) : ('none' as const),
  }
}
