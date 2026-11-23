import { useCallback, useState } from 'react'

/** Which rows of a table are ticked: one box, all boxes on the page, or none. */
export function useSelection<K>() {
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
  const setAll = useCallback((keys: K[], on: boolean) => setSelected(on ? new Set(keys) : new Set()), [])
  const clear = useCallback(() => setSelected(new Set()), [])

  return { selected, toggle, setAll, clear }
}
