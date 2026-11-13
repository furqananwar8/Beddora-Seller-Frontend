import { useCallback, useRef, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'

interface ColumnResizeOptions {
  initial: number
  min: number
  max: number
  /** Where the width is remembered between visits (per browser). */
  storageKey: string
}

const KEYBOARD_STEP = 16

/**
 * A column the user can widen or narrow by dragging a handle on its edge. Give `width` to the header and body cells and
 * spread `handleProps` on the handle element. Drag with the mouse, touch or pen; with the handle focused, Left / Right
 * move it a step; a double click puts it back to `initial`. The width is saved once a drag ends.
 */
export function useColumnResize({ initial, min, max, storageKey }: ColumnResizeOptions) {
  const [saved, setSaved] = useLocalStorage<number>(storageKey, initial)
  const clamp = useCallback((value: number) => Math.min(max, Math.max(min, Math.round(value))), [min, max])
  const [width, setWidth] = useState(() => clamp(Number(saved) || initial))
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ startX: number; startWidth: number } | null>(null)

  const commit = (value: number) => {
    setWidth(value)
    setSaved(value)
  }

  const handleProps = {
    role: 'separator' as const,
    'aria-orientation': 'vertical' as const,
    'aria-valuenow': width,
    'aria-valuemin': min,
    'aria-valuemax': max,
    tabIndex: 0,
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      // The handle sits inside a clickable (sortable) header: pressing it must not sort
      event.preventDefault()
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = { startX: event.clientX, startWidth: width }
      setDragging(true)
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (!drag.current) return
      setWidth(clamp(drag.current.startWidth + event.clientX - drag.current.startX))
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
      if (!drag.current) return
      event.currentTarget.releasePointerCapture(event.pointerId)
      drag.current = null
      setDragging(false)
      setSaved(width)
    },
    onClick: (event: React.MouseEvent<HTMLElement>) => event.stopPropagation(),
    onDoubleClick: (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation()
      commit(clamp(initial))
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      event.stopPropagation()
      commit(clamp(width + (event.key === 'ArrowRight' ? KEYBOARD_STEP : -KEYBOARD_STEP)))
    },
  }

  return { width, dragging, handleProps }
}
