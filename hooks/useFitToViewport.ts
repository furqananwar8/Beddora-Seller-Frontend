import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

interface Header {
  height: number
  background: string
}

const NO_HEADER: Header = { height: 0, background: 'transparent' }

/** The table header inside a scrolling box: how tall it is and its colour (which also fills the strip the scrollbar leaves beside it). */
function measureHeader(element: HTMLElement): Header {
  element.dataset.fitScroll = ''
  const thead = element.querySelector('thead')
  const cell = thead?.querySelector('th')
  const background = [cell, thead].map((node) => (node ? getComputedStyle(node).backgroundColor : 'transparent')).find((color) => color !== 'rgba(0, 0, 0, 0)')
  return { height: Math.round(thead?.getBoundingClientRect().height ?? 0), background: background ?? 'transparent' }
}

const headerVars = (header: Header) => ({ '--head-h': `${header.height}px`, '--head-bg': header.background })

/** Runs `measure` now, when the window resizes, when the page's height changes, and when the box's content changes. */
function useMeasure<T extends HTMLElement>(measure: (element: T) => void, deps: unknown[]) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const run = () => ref.current && measure(ref.current)
    run()
    window.addEventListener('resize', run)
    const observer = new ResizeObserver(run)
    observer.observe(document.body)
    // The table (and so its header) can arrive after the box does: rows loading, a loading state replaced by data
    const mutations = new MutationObserver(run)
    if (ref.current) mutations.observe(ref.current, { childList: true, subtree: true })
    return () => {
      window.removeEventListener('resize', run)
      observer.disconnect()
      mutations.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

/**
 * Sizes a scrolling box so its bottom edge (with its horizontal scrollbar) stays inside the window: its maximum height is
 * what is left of the window below where it starts, less `reserve` for whatever sits under it (a pagination footer and
 * the page padding). Never below `min`, so a very short window scrolls the page instead of squeezing the box away.
 * Recomputed when the window or the page's height changes (filters appearing, rows loading).
 *
 * The box's vertical scrollbar starts below the table's sticky header (`--head-h`, used by the `data-fit-scroll` rule in
 * globals.css), so the bar runs behind nothing and never sits on top of the header cells.
 */
export function useFitToViewport<T extends HTMLElement>(reserve = 76, min = 320) {
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)
  const [header, setHeader] = useState(NO_HEADER)
  const ref = useMeasure<T>((element) => {
    // Where it starts on the page, whatever the page's scroll position is now
    const top = element.getBoundingClientRect().top + window.scrollY
    setMaxHeight(Math.max(min, Math.floor(window.innerHeight - top - reserve)))
    setHeader(measureHeader(element))
  }, [reserve, min])

  const style = maxHeight === undefined ? undefined : ({ maxHeight, ...headerVars(header) } as CSSProperties)
  return { ref, style }
}

/** Only the scrollbar part of `useFitToViewport`, for a box that sets its own height: the vertical bar starts below the sticky header. */
export function useScrollbarBelowHeader<T extends HTMLElement>() {
  const [header, setHeader] = useState(NO_HEADER)
  const ref = useMeasure<T>((element) => setHeader(measureHeader(element)), [])
  return { ref, style: headerVars(header) as CSSProperties }
}
