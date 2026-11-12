import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

/**
 * Sizes a scrolling box so its bottom edge (with its horizontal scrollbar) stays inside the window: its maximum height is
 * what is left of the window below where it starts, less `reserve` for whatever sits under it (a pagination footer and
 * the page padding). Never below `min`, so a very short window scrolls the page instead of squeezing the box away.
 * Recomputed when the window or the page's height changes (filters appearing, rows loading).
 */
export function useFitToViewport<T extends HTMLElement>(reserve = 96, min = 280) {
  const ref = useRef<T>(null)
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    const measure = () => {
      const element = ref.current
      if (!element) return
      // Where it starts on the page, whatever the page's scroll position is now
      const top = element.getBoundingClientRect().top + window.scrollY
      setMaxHeight(Math.max(min, Math.floor(window.innerHeight - top - reserve)))
    }
    measure()
    window.addEventListener('resize', measure)
    const observer = new ResizeObserver(measure)
    observer.observe(document.body)
    return () => {
      window.removeEventListener('resize', measure)
      observer.disconnect()
    }
  }, [reserve, min])

  const style: CSSProperties | undefined = maxHeight === undefined ? undefined : { maxHeight }
  return { ref, style }
}
