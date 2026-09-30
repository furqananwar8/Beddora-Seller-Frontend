"use client"

import React, { useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Input } from '@/design-system/inputs'
import type { CarrierEntry } from '@/services/api/inboundShipments.api'
import { InboundShipment } from './types'
import { DialogFooter, formatUnits } from './ShipmentParts'
import { getShipmentUnits } from './workflow'

const MAX_CARRIER_LENGTH = 60

const isoDay = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
const today = () => isoDay(new Date())
const tomorrow = () => isoDay(new Date(Date.now() + 24 * 60 * 60 * 1000))

interface CarrierModalProps {
  shipment: InboundShipment | null
  /** Saves the carrier names; the backend tells Amazon each shipment ships with the seller's own carrier. */
  onConfirm: (carriers: CarrierEntry[], readyToShipDate?: string) => Promise<void>
  /** Back to the delivery window step. */
  onBack: () => void
  onClose: () => void
}

/**
 * The seller books the carrier outside Amazon and types its name here, one per
 * Amazon shipment. No carrier quotes are requested from Amazon.
 */
export const CarrierModal: React.FC<CarrierModalProps> = ({ shipment, ...rest }) => (
  <Modal isOpen={shipment !== null} onClose={rest.onClose} title="Enter carrier" size="lg">
    {shipment && <CarrierForm key={shipment.id} shipment={shipment} {...rest} />}
  </Modal>
)

const CarrierForm: React.FC<Omit<CarrierModalProps, 'shipment'> & { shipment: InboundShipment }> = ({ shipment, onConfirm, onBack, onClose }) => {
  const legs = shipment.legs.filter((l) => l.amazonShipmentId)
  const [names, setNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(legs.map((l) => [l.amazonShipmentId!, l.carrier ?? shipment.carrier ?? '']))
  )
  // Amazon is only told once; going Back to correct a carrier name doesn't ask for the date again
  const needsDate = !legs.every((l) => l.shippingSolution === 'USE_YOUR_OWN_CARRIER')
  const [readyDate, setReadyDate] = useState(tomorrow)
  const [touched, setTouched] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const missing = legs.some((l) => !names[l.amazonShipmentId!]?.trim())
  const dateInvalid = needsDate && (!readyDate || readyDate < today())

  const handleConfirm = async () => {
    setTouched(true)
    if (missing || dateInvalid || legs.length === 0) return
    setIsSaving(true)
    setError(null)
    try {
      await onConfirm(legs.map((l) => ({ shipmentId: l.amazonShipmentId!, carrier: names[l.amazonShipmentId!].trim() })), needsDate ? readyDate : undefined)
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Could not save the carrier. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <p className="mb-4 text-sm text-text-muted">
        Enter the carrier you booked for each Amazon shipment. Amazon will be told you are shipping with your own carrier;
        tracking is entered when you mark the shipment as shipped.{' '}
        <span className="text-text-primary">
          {shipment.reference} · {formatUnits(getShipmentUnits(shipment))} units
        </span>
      </p>

      {legs.length === 0 && <p className="text-sm text-danger-700">Amazon hasn't created any shipments for this plan yet.</p>}

      <div className="space-y-4">
        {legs.map((leg) => {
          const id = leg.amazonShipmentId!
          return (
            <div key={id} className="rounded-lg border border-border p-4">
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                <span className="font-mono font-semibold text-text-secondary">{leg.shipmentConfirmationId ?? id}</span>
                <span>
                  {leg.fulfillmentCenter}
                  {leg.fcLocation ? ` · ${leg.fcLocation}` : ''}
                </span>
                <span>{formatUnits(leg.units)} units</span>
              </div>
              <Input
                label="Carrier"
                placeholder="e.g. UPS, FedEx, XPO"
                maxLength={MAX_CARRIER_LENGTH}
                value={names[id] ?? ''}
                disabled={isSaving}
                onChange={(e) => setNames((prev) => ({ ...prev, [id]: e.target.value }))}
                error={touched && !names[id]?.trim() ? 'Enter the carrier name' : undefined}
              />
            </div>
          )
        })}
      </div>

      {needsDate && (
        <div className="mt-4 sm:max-w-xs">
          <Input
            label="Ready to ship on"
            type="date"
            min={today()}
            value={readyDate}
            disabled={isSaving}
            onChange={(e) => setReadyDate(e.target.value)}
            helperText="The date the boxes are ready for your carrier to pick up."
            error={touched && dateInvalid ? 'Pick today or a later date' : undefined}
          />
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </div>
      )}

      <DialogFooter onBack={onBack} backDisabled={isSaving}>
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={isSaving || legs.length === 0}>
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-white" /> Telling Amazon…
            </span>
          ) : (
            'Confirm carrier'
          )}
        </Button>
      </DialogFooter>
    </>
  )
}
