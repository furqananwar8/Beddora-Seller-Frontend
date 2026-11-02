import { useLayoutEffect, useState } from 'react'

/** The element's scrolling ancestors: the boxes that can scroll it out of view. */
function scrollParents(element: HTMLElement): HTMLElement[] {
  const parents: HTMLElement[] = []
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflow, overflowX, overflowY } = getComputedStyle(node)
    if (/(auto|scroll|hidden)/.test(`${overflow}${overflowX}${overflowY}`)) parents.push(node)
  }
  return parents
}

/** Whether any part of `rect` is still inside every box (a row scrolled past a table's edge isn't). */
const insideAll = (rect: DOMRect, boxes: HTMLElement[]) =>
  boxes.every((box) => {
    const bounds = box.getBoundingClientRect()
    return rect.bottom > bounds.top && rect.top < bounds.bottom && rect.right > bounds.left && rect.left < bounds.right
  })

/**
 * The anchor's live position, for a popover drawn `position: fixed` next to it: measured again whenever anything
 * scrolls or the window resizes, so the popover moves with its row. Null while the anchor is scrolled out of view of
 * its scrolling container (a table body), so the popover hides there instead of floating over other content.
 */
export function useAnchoredRect(anchor: HTMLElement | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useLayoutEffect(() => {
    if (!anchor) return setRect(null)
    const boxes = scrollParents(anchor)
    const place = () => {
      const next = anchor.getBoundingClientRect()
      setRect(anchor.isConnected && insideAll(next, boxes) ? next : null)
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchor])
  return rect
}
