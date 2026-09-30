"use client"

import React, { useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import type { ShipFromRequest } from './useShipments'
import { InboundShipment } from './types'
import { formatAddressLine } from './AddressForm'
import { ShipFromChoice, ShipFromPicker, shipFromRequest } from './ShipFromPicker'

interface EditShipFromModalProps {
  shipment: InboundShipment | null
  /** Recreates the Amazon plan from the new address; the warehouse options are then requested again. */
  onConfirm: (choice: ShipFromRequest) => Promise<void>
  onClose: () => void
}

/** Changes where a shipment ships from after the Amazon plan exists (Choose Destination Warehouse step). */
export const EditShipFromModal: React.FC<EditShipFromModalProps> = ({ shipment, ...rest }) => (
  <Modal isOpen={shipment !== null} onClose={rest.onClose} title="Edit ship-from address" size="lg">
    {shipment && <Form key={shipment.id} shipment={shipment} {...rest} />}
  </Modal>
)

const Form: React.FC<Omit<EditShipFromModalProps, 'shipment'> & { shipment: InboundShipment }> = ({ shipment, onConfirm, onClose }) => {
  const [choice, setChoice] = useState<ShipFromChoice | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    const request = shipFromRequest(choice)
    if (!request || (!request.shipFromAddressId && !request.shipFromAddress)) {
      setShowErrors(true)
      return setError(request ? 'Pick a saved address or enter one.' : 'Complete the address first.')
    }
    setIsSaving(true)
    setError(null)
    try {
      await onConfirm(request)
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Could not change the ship-from address.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {shipment.shipFrom && (
        <p className="mb-3 text-sm text-text-muted">
          Currently shipping from <span className="text-text-primary">{formatAddressLine(shipment.shipFrom)}</span>.
        </p>
      )}
      <div className="mb-4 rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-700">
        Amazon assigns warehouses from the ship-from address, so it will create a new inbound plan. Your box contents are
        re-sent automatically, then you choose the warehouse again.
      </div>

      <ShipFromPicker label={null} value={choice} onChange={(c) => { setChoice(c); setError(null) }} showErrors={showErrors} disabled={isSaving} />

      {error && (
        <div role="alert" className="mt-4 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={isSaving || !choice}>
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-white" /> Recreating the plan…
            </span>
          ) : (
            'Save & recreate plan'
          )}
        </Button>
      </div>
    </>
  )
}
