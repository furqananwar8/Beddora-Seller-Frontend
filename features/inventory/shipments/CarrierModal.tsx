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
const MAX_APPOINTMENT_ID_LENGTH = 60

const isoDay = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
const today = () => isoDay(new Date())
const tomorrow = () => isoDay(new Date(Date.now() + 24 * 60 * 60 * 1000))

interface CarrierModalProps {
  shipment: InboundShipment | null
  /** Saves each shipment's carrier booking; the backend tells Amazon each one ships with the seller's own carrier. */
  onConfirm: (carriers: CarrierEntry[]) => Promise<void>
  /** Back to the delivery window step. */
  onBack: () => void
  onClose: () => void
}

/** What the seller types for one Amazon shipment's carrier booking. */
interface BookingFields {
  carrier: string
  pickupDate: string
  deliveryDate: string
  amazonAppointmentId: string
}

/**
 * The seller books the carrier outside Amazon and types the booking here, one per
 * Amazon shipment. No carrier quotes are requested from Amazon. Only the pickup date
 * is passed on to Amazon (as ready-to-ship); delivery date and appointment ID are our own record.
 */
export const CarrierModal: React.FC<CarrierModalProps> = ({ shipment, ...rest }) => (
  <Modal isOpen={shipment !== null} onClose={rest.onClose} title="Enter carrier" size="lg">
    {shipment && <CarrierForm key={shipment.id} shipment={shipment} {...rest} />}
  </Modal>
)

const CarrierForm: React.FC<Omit<CarrierModalProps, 'shipment'> & { shipment: InboundShipment }> = ({ shipment, onConfirm, onBack, onClose }) => {
  const legs = shipment.legs.filter((l) => l.amazonShipmentId)
  const [bookings, setBookings] = useState<Record<string, BookingFields>>(() =>
    Object.fromEntries(
      legs.map((l) => [
        l.amazonShipmentId!,
        {
          carrier: l.carrier ?? shipment.carrier ?? '',
          pickupDate: l.pickupDate ?? tomorrow(),
          deliveryDate: l.deliveryDate ?? l.deliveryWindow?.start.slice(0, 10) ?? '',
          amazonAppointmentId: l.amazonAppointmentId ?? '',
        },
      ])
    )
  )
  // Amazon is only told once; going Back to correct a booking can keep an earlier pickup date
  const amazonNotToldYet = !legs.every((l) => l.shippingSolution === 'USE_YOUR_OWN_CARRIER')
  const [touched, setTouched] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (id: string, patch: Partial<BookingFields>) => setBookings((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  const errorsFor = (b: BookingFields) => ({
    carrier: b.carrier.trim() ? undefined : 'Enter the carrier name',
    pickupDate: !b.pickupDate || (amazonNotToldYet && b.pickupDate < today()) ? 'Pick today or a later date' : undefined,
    deliveryDate: !b.deliveryDate ? 'Pick the delivery date' : b.deliveryDate < b.pickupDate ? "Can't be before the pickup date" : undefined,
  })
  const invalid = legs.some((l) => Object.values(errorsFor(bookings[l.amazonShipmentId!])).some(Boolean))

  const handleConfirm = async () => {
    setTouched(true)
    if (invalid || legs.length === 0) return
    setIsSaving(true)
    setError(null)
    try {
      await onConfirm(
        legs.map((l) => {
          const b = bookings[l.amazonShipmentId!]
          return {
            shipmentId: l.amazonShipmentId!,
            carrier: b.carrier.trim(),
            pickupDate: b.pickupDate,
            deliveryDate: b.deliveryDate,
            amazonAppointmentId: b.amazonAppointmentId.trim() || undefined,
          }
        })
      )
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
        Enter the carrier booking for each Amazon shipment. Amazon will be told you are shipping with your own carrier and
        when the boxes are ready (the pickup date). The delivery date and appointment ID are kept in Beddora only;
        tracking is entered when you mark the shipment as shipped.{' '}
        <span className="text-text-primary">
          {shipment.reference} · {formatUnits(getShipmentUnits(shipment))} units
        </span>
      </p>

      {legs.length === 0 && <p className="text-sm text-danger-700">Amazon hasn't created any shipments for this plan yet.</p>}

      <div className="space-y-4">
        {legs.map((leg) => {
          const id = leg.amazonShipmentId!
          const b = bookings[id]
          const errors = errorsFor(b)
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
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Carrier name"
                  placeholder="e.g. UPS, FedEx, XPO"
                  maxLength={MAX_CARRIER_LENGTH}
                  value={b.carrier}
                  disabled={isSaving}
                  onChange={(e) => update(id, { carrier: e.target.value })}
                  error={touched ? errors.carrier : undefined}
                />
                <Input
                  label="Amazon appointment ID (optional)"
                  maxLength={MAX_APPOINTMENT_ID_LENGTH}
                  value={b.amazonAppointmentId}
                  disabled={isSaving}
                  onChange={(e) => update(id, { amazonAppointmentId: e.target.value })}
                  helperText="Kept in Beddora only; not sent to Amazon."
                />
                <Input
                  label="Pickup date"
                  type="date"
                  min={amazonNotToldYet ? today() : undefined}
                  value={b.pickupDate}
                  disabled={isSaving}
                  onChange={(e) => update(id, { pickupDate: e.target.value })}
                  helperText={amazonNotToldYet ? 'Also sent to Amazon as the date the boxes are ready.' : 'Kept in Beddora only.'}
                  error={touched ? errors.pickupDate : undefined}
                />
                <Input
                  label="Delivery date"
                  type="date"
                  min={b.pickupDate || undefined}
                  value={b.deliveryDate}
                  disabled={isSaving}
                  onChange={(e) => update(id, { deliveryDate: e.target.value })}
                  helperText="Kept in Beddora only; not sent to Amazon."
                  error={touched ? errors.deliveryDate : undefined}
                />
              </div>
            </div>
          )
        })}
      </div>

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
