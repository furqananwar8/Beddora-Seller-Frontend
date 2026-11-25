'use client'

import React, { useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { useGetShipmentCarriersQuery } from '@/services/api/inboundShipments.api'
import { useUpdateBolCarrierDetailsMutation, type BolLeg } from '@/services/api/shipmentBols.api'

interface CarrierDetailsModalProps {
  shipmentId: string
  /** The FC whose carrier-step values are edited; null when closed. */
  leg: BolLeg | null
  onClose: () => void
}

/**
 * Edits what the carrier step recorded for one FC (carrier, pick-up and delivery dates, appointment ID). These are
 * Beddora's own record: Amazon isn't asked and the shipment stays on its current step, so nothing in the FBA flow
 * moves. Every trailer of the FC follows the new values; the built BOLs go back to draft.
 */
export const CarrierDetailsModal: React.FC<CarrierDetailsModalProps> = ({ shipmentId, leg, onClose }) => (
  <Modal isOpen={leg !== null} onClose={onClose} title={leg ? `Carrier details · ${leg.fulfillmentCenter}` : 'Carrier details'} size="md">
    {leg && <CarrierDetailsForm key={leg.amazonShipmentId} shipmentId={shipmentId} leg={leg} onClose={onClose} />}
  </Modal>
)

const CarrierDetailsForm: React.FC<{ shipmentId: string; leg: BolLeg; onClose: () => void }> = ({ shipmentId, leg, onClose }) => {
  const step = leg.carrierStep
  const { data: carriers = [], isLoading } = useGetShipmentCarriersQuery()
  const [update, { isLoading: isSaving }] = useUpdateBolCarrierDetailsMutation()
  const [carrierPartnerId, setCarrierPartnerId] = useState<number | null>(step.carrierPartnerId)
  const [pickupDate, setPickupDate] = useState(step.pickupDate ?? '')
  const [deliveryDate, setDeliveryDate] = useState(step.deliveryDate ?? '')
  const [appointmentNo, setAppointmentNo] = useState(step.appointmentNo ?? '')
  const [error, setError] = useState<string | null>(null)

  const problem = !carrierPartnerId
    ? 'Pick the carrier'
    : !pickupDate
    ? 'Pick the pick-up date'
    : !deliveryDate
    ? 'Pick the delivery date'
    : deliveryDate < pickupDate
    ? "Delivery can't be before pick-up"
    : null

  const save = async () => {
    if (problem || !carrierPartnerId) return setError(problem)
    setError(null)
    try {
      await update({ shipmentId, amazonShipmentId: leg.amazonShipmentId, carrierPartnerId, pickupDate, deliveryDate, appointmentNo: appointmentNo.trim() || null }).unwrap()
      onClose()
    } catch (err) {
      const message = (err as { data?: { message?: string; error?: string } })?.data
      setError(message?.message ?? message?.error ?? 'Could not save the carrier details')
    }
  }

  return (
    <>
      <p className="mb-4 text-sm text-text-muted">
        Updates the carrier step&apos;s record for {leg.fulfillmentCenter}. The partner isn&apos;t told and the shipment stays on its current step. All of this FC&apos;s
        trailers print the new values; ready BOLs go back to draft.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 sm:col-span-2">
          <p className="ds-input-label">Carrier</p>
          <SearchableSelect<{ id: number; name: string }>
            ariaLabel="Carrier"
            value={carriers.find((c) => c.id === carrierPartnerId) ?? null}
            onChange={(carrier) => setCarrierPartnerId(carrier.id)}
            options={carriers}
            getKey={(carrier) => carrier.id}
            getLabel={(carrier) => carrier.name}
            loading={isLoading}
            placeholder={step.carrier && !carrierPartnerId ? `${step.carrier} (pick from vendors)` : 'Select a carrier'}
            searchPlaceholder="Search vendors"
            emptyText="No vendor partners yet. Add the carrier in Partner Profile as a vendor."
            disabled={isSaving}
          />
        </div>
        <div>
          <label htmlFor="bol-pickup-date" className="ds-input-label">Pick-up date</label>
          <SingleDatePicker id="bol-pickup-date" value={pickupDate} disabled={isSaving} onChange={setPickupDate} />
        </div>
        <div>
          <label htmlFor="bol-delivery-date" className="ds-input-label">Delivery date</label>
          <SingleDatePicker id="bol-delivery-date" min={pickupDate || undefined} value={deliveryDate} disabled={isSaving} onChange={setDeliveryDate} />
        </div>
        <div className="sm:col-span-2">
          <Input label="Delivery appointment ID (optional)" maxLength={60} value={appointmentNo} disabled={isSaving} onChange={(e) => setAppointmentNo(e.target.value)} />
        </div>
      </div>
      {error && (
        <div role="alert" className="mt-4 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={save} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save carrier details'}
        </Button>
      </div>
    </>
  )
}
