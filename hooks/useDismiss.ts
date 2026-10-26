import { RefObject, useEffect } from 'react'

/** Calls `onDismiss` on a mouse press outside `ref` or on Escape: how a popover closes. */
export function useDismiss(ref: RefObject<HTMLElement>, onDismiss: () => void) {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss()
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [ref, onDismiss])
}
