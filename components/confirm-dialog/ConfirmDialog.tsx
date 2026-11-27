'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  children: React.ReactNode
  confirmLabel: string
  tone?: 'default' | 'danger'
  busy?: boolean
  /** A third choice between Cancel and the confirm button (e.g. "Clear all"). */
  secondaryLabel?: string
  onSecondary?: () => void
  onConfirm: () => void
  onClose: () => void
}

/** "Are you sure?" for irreversible or far-reaching actions (archive, delete, close, approve). */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, title, children, confirmLabel, tone = 'default', busy, secondaryLabel, onSecondary, onConfirm, onClose }) => (
  <Modal isOpen={isOpen} onClose={busy ? () => undefined : onClose} title={title} size="sm" closeOnEscape={!busy}>
    <div className="text-sm text-text-secondary">{children}</div>
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
        Cancel
      </Button>
      {secondaryLabel && onSecondary && (
        <Button type="button" variant="danger" onClick={onSecondary} disabled={busy}>
          {secondaryLabel}
        </Button>
      )}
      <Button type="button" variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} isLoading={busy}>
        {confirmLabel}
      </Button>
    </div>
  </Modal>
)
