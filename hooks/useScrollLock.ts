import { useEffect } from 'react'

/**
 * Stops the page behind an overlay from scrolling while `active` is true.
 * Locks both <html> and <body> because either can be the document scroller,
 * and restores their previous values on release.
 */
export function useScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return
    const targets = [document.documentElement, document.body]
    const previous = targets.map((el) => el.style.overflow)
    targets.forEach((el) => (el.style.overflow = 'hidden'))
    return () => targets.forEach((el, i) => (el.style.overflow = previous[i]))
  }, [active])
}
