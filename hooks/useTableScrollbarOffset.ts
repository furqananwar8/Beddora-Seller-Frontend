import { useEffect } from 'react'

const HEAD_HEIGHT_VAR = '--table-head-h'

/** The nearest ancestor that really scrolls vertically (its height is capped and the content overflows). */
const verticalScroller = (from: HTMLElement): HTMLElement | null => {
  for (let el = from.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el)
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return el
  }
  return null
}

/**
 * A table's sticky header sits inside its scroll container, so the vertical scrollbar would run beside the header.
 * This tells each such container how tall its header is (--table-head-h) so the global scrollbar track in
 * globals.css can start below it. Runs once for the whole app and follows tables as they appear or resize.
 */
export function useTableScrollbarOffset(): void {
  useEffect(() => {
    let frame = 0
    const marked = new Set<HTMLElement>()

    const sync = () => {
      frame = 0
      const current = new Set<HTMLElement>()
      document.querySelectorAll<HTMLElement>('thead').forEach((thead) => {
        const scroller = verticalScroller(thead)
        if (!scroller) return
        scroller.style.setProperty(HEAD_HEIGHT_VAR, `${thead.getBoundingClientRect().height}px`)
        current.add(scroller)
      })
      marked.forEach((el) => !current.has(el) && el.style.removeProperty(HEAD_HEIGHT_VAR))
      marked.clear()
      current.forEach((el) => marked.add(el))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sync)
    }

    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', schedule)
    schedule()

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])
}
