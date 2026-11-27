'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useMarkContainerFinalMutation, type ContainerItem, type FinalContainerStatus } from '@/services/api/procurement.api'
import { FINAL_STATUS_OPTIONS, containerLabel } from '../shared/poMeta'

interface MarkFinalModalProps {
  /** The container being finished; closed when null. */
  container: ContainerItem | null
  onClose: () => void
  /** Sends the user to the container form to fill in what is missing. */
  onFillIn: (container: ContainerItem) => void
}

/**
 * "Mark as final": where the container was delivered. The status is then fixed for good, so a container still missing
 * details (or a packaging list) is sent back to fill them in first; the server checks the same.
 */
export const MarkFinalModal: React.FC<MarkFinalModalProps> = ({ container, onClose, onFillIn }) => {
  const { success, failure } = useApiFeedback()
  const [markFinal, { isLoading }] = useMarkContainerFinalMutation()
  const [status, setStatus] = useState<FinalContainerStatus | null>(null)
  useEffect(() => setStatus(null), [container?.id])

  const missing = container?.finalBlockers ?? []
  const submit = async () => {
    if (!container || !status) return
    try {
      await markFinal({ id: container.id, status }).unwrap()
      success(`${containerLabel(container)} marked as final`)
      onClose()
    } catch (error) {
      failure(error, 'Could not mark the container as final')
    }
  }

  return (
    <Modal isOpen={container !== null} onClose={onClose} title={`Mark as final · ${container ? containerLabel(container) : ''}`} size="md" closeOnEscape={!isLoading}>
      {container && (
        <div className="flex flex-col gap-4">
          {missing.length > 0 ? (
            <>
              <p className="text-sm text-text-primary">Fill in the following before this container can be marked as final:</p>
              <ul className="list-disc pl-5 text-sm text-danger-600">
                {missing.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button type="button" onClick={() => (onClose(), onFillIn(container))}>
                  Fill in details
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-text-muted">Where was it delivered? The container's status is fixed after this and cannot be changed.</p>
              <div role="radiogroup" aria-label="Delivered to" className="flex flex-col gap-2">
                {FINAL_STATUS_OPTIONS.map((option) => (
                  <label key={option.status} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary-500 has-[:checked]:bg-secondary-50">
                    <input type="radio" name="final-status" className="mt-1" checked={status === option.status} onChange={() => setStatus(option.status)} />
                    <span>
                      <span className="block font-medium text-text-primary">{option.label}</span>
                      <span className="block text-xs text-text-muted">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void submit()} isLoading={isLoading} disabled={!status}>
                  Mark as final
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
