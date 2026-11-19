'use client'

import React from 'react'
import { Copy } from 'lucide-react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import type { InvitationLink } from '@/services/api/invites.api'

interface Props {
  email: string
  link: InvitationLink | null
  onClose: () => void
}

/** Shows a freshly issued invitation link with a copy button, for sending by hand when the email doesn't arrive. */
export const InvitationLinkModal: React.FC<Props> = ({ email, link, onClose }) => {
  const { success, info } = useApiFeedback()

  const copy = () => {
    if (!link) return
    navigator.clipboard.writeText(link.url).then(
      () => success('Invitation link copied'),
      () => info('Copy is blocked by the browser; select the link instead')
    )
  }

  return (
    <Modal isOpen={Boolean(link)} onClose={onClose} title="Invitation link" size="md">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Send this link to <b className="text-text-primary">{email}</b> so they can accept the invitation. Any link
          issued before this one no longer works.
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-border p-2">
          <input
            readOnly
            value={link?.url ?? ''}
            aria-label="Invitation link"
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 bg-transparent font-mono text-xs text-text-primary outline-none"
          />
          <button
            type="button"
            onClick={copy}
            aria-label="Copy invitation link"
            className="rounded p-1.5 text-text-muted hover:bg-secondary-100 hover:text-text-primary"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        {link && (
          <p className="text-xs text-text-muted">Valid until {new Date(link.expiresAt).toLocaleString()}.</p>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
