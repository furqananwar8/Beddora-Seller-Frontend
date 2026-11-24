'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'

interface UnsavedChangesDialogProps {
  isOpen: boolean
  /** What has the changes, e.g. "This rule". */
  subject: string
  /** Where the user is heading, e.g. "another rule". */
  destination: string
  saving?: boolean
  onStay: () => void
  onDiscard: () => void
  onSave: () => void
}

/** "Save, discard or stay": asked before leaving something that has unsaved changes. */
export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({ isOpen, subject, destination, saving, onStay, onDiscard, onSave }) => (
  <Modal isOpen={isOpen} onClose={saving ? () => undefined : onStay} title="Unsaved changes" size="sm" closeOnEscape={!saving}>
    <p className="text-sm text-text-secondary">
      {subject} has changes that are not saved. Save them before moving to {destination}?
    </p>
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onStay} disabled={saving}>
        Stay
      </Button>
      <Button type="button" variant="outline" onClick={onDiscard} disabled={saving}>
        Discard and continue
      </Button>
      <Button type="button" variant="primary" onClick={onSave} isLoading={saving}>
        Save and continue
      </Button>
    </div>
  </Modal>
)
