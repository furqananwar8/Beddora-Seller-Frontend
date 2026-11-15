'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'

type Pending = { kind: 'link'; href: string } | { kind: 'back' }

interface Options {
  /** There is unsaved work. */
  active: boolean
  /** Saves it as a draft; resolves true when saved (leaving then goes on). */
  onSave: () => Promise<boolean>
}

/**
 * Stops work from being lost without asking. Closing or refreshing the tab shows the browser's own "leave site?"
 * prompt (browsers don't allow more than that there, and nothing can be saved from it). Leaving through a link or
 * the Back button inside the app opens a dialog with Save as draft / Leave without saving / Keep editing.
 */
export function useLeaveGuard({ active, onSave }: Options) {
  const router = useRouter()
  const [pending, setPending] = useState<Pending | null>(null)
  const [saving, setSaving] = useState(false)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    if (!active) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    // In-app links: ask first
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname + url.search === window.location.pathname + window.location.search) return
      event.preventDefault()
      event.stopPropagation()
      setPending({ kind: 'link', href: url.pathname + url.search + url.hash })
    }
    // Back button: one extra history entry absorbs it, so the page can ask before really going back
    window.history.pushState({ leaveGuard: true }, '', window.location.href)
    const onPopState = () => {
      if (!activeRef.current) return
      window.history.pushState({ leaveGuard: true }, '', window.location.href)
      setPending({ kind: 'back' })
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
    }
  }, [active])

  const proceed = useCallback(
    (target: Pending) => {
      setPending(null)
      // The guard is off once nothing is unsaved, so the navigation isn't asked about again
      activeRef.current = false
      if (target.kind === 'link') router.push(target.href)
      else window.history.go(-2) // the entry the guard added, and the page being left
    },
    [router]
  )

  const dialog = (
    <Modal isOpen={pending !== null} onClose={saving ? () => undefined : () => setPending(null)} title="Save this shipment as a draft?" size="sm" closeOnEscape={!saving}>
      <p className="text-sm text-text-secondary">You have not booked this shipment. Save it as a draft to finish it later from Bookings › Drafts, or leave without saving.</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => setPending(null)} disabled={saving}>
          Keep editing
        </Button>
        <Button type="button" variant="outline" onClick={() => pending && proceed(pending)} disabled={saving}>
          Leave without saving
        </Button>
        <Button
          type="button"
          isLoading={saving}
          onClick={async () => {
            if (!pending) return
            setSaving(true)
            const saved = await onSave().catch(() => false)
            setSaving(false)
            if (saved) proceed(pending)
          }}
        >
          Save as draft
        </Button>
      </div>
    </Modal>
  )

  return { dialog }
}
