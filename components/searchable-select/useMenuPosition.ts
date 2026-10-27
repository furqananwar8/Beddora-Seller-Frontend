import { useLayoutEffect, useState } from 'react'

/** Room the menu wants below the trigger before it opens upwards instead. */
const MENU_ROOM = 320
const GAP = 4

export type MenuPosition = { left: number; width: number } & ({ top: number } | { bottom: number })

/**
 * Where the menu goes: under the trigger, or above it when there is no room below. The menu is portalled
 * to <body> with fixed positioning, so a scrolling table or card never clips it; it follows the trigger
 * while anything scrolls or the window resizes.
 */
export function useMenuPosition(anchor: React.RefObject<HTMLElement>, open: boolean): MenuPosition | null {
  const [position, setPosition] = useState<MenuPosition | null>(null)
  useLayoutEffect(() => {
    if (!open) return setPosition(null)
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect()
      if (!rect) return
      const below = window.innerHeight - rect.bottom
      const upwards = below < MENU_ROOM && rect.top > below
      setPosition(upwards ? { left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + GAP } : { left: rect.left, width: rect.width, top: rect.bottom + GAP })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchor, open])
  return position
}
