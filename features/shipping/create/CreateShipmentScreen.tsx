'use client'

import React, { useEffect, useReducer, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetShipFromOptionsQuery } from '@/services/api/shipping.api'
import { BOOKINGS_HREF, money } from '../shippingMeta'
import type { ParcelShipmentDto } from '../types'
import { AddressStep, defaultShipFrom } from './AddressStep'
import { BookingConfirmed } from './BookingConfirmed'
import { BookingStep } from './BookingStep'
import { RatesStep } from './RatesStep'
import { draftReducer, INITIAL_DRAFT, UNITS, type WizardStep } from './shipmentDraft'
import { isCrossBorder, shipmentErrors } from './shipmentRules'
import { ShipmentStep } from './ShipmentStep'
import { useDraftRates } from './useDraftRates'
import { CREATE_STEPS, WizardStepper } from './WizardStepper'

/**
 * Shipping › Create shipment: Address Info › Shipment Info › Rates › Booking. The whole draft lives in one reducer,
 * so going back keeps everything; any change to what is quoted makes the rates stale and they are fetched again.
 */
export const CreateShipmentScreen: React.FC = () => {
  const router = useRouter()
  const canWrite = useAppAbility().can('write', 'shipping:parcels')
  const [draft, dispatch] = useReducer(draftReducer, INITIAL_DRAFT)
  const [booked, setBooked] = useState<ParcelShipmentDto | null>(null)
  const { data: addresses = [], isLoading: loadingAddresses } = useGetShipFromOptionsQuery()
  const shipFrom = addresses.find((address) => address.id === draft.shipFromId)
  const crossBorder = isCrossBorder(draft, shipFrom)
  const errors = shipmentErrors(draft, crossBorder)
  const { stream, rate, refetch: refetchRates, reset: resetRates } = useDraftRates(draft, dispatch, crossBorder)

  // The first warehouse (else the default address) is picked up front
  useEffect(() => {
    const fallback = defaultShipFrom(addresses)
    if (!draft.shipFromId && fallback) dispatch({ type: 'setShipFrom', id: fallback.id })
  }, [addresses, draft.shipFromId])

  const startOver = () => {
    resetRates()
    setBooked(null)
    dispatch({ type: 'reset' })
  }

  if (!canWrite) return <Alert variant="info">You can see the bookings, but creating shipments needs the Shipping write permission.</Alert>
  if (booked) return <BookingConfirmed shipment={booked} onShipmentChange={setBooked} next={{ label: 'Create another shipment', onClick: startOver }} />

  const units = UNITS[draft.units]
  const summaries = [
    shipFrom && draft.shipTo.address.city ? `${shipFrom.city} → ${draft.shipTo.address.city}, ${draft.shipTo.address.province}` : null,
    `1 pkg · ${draft.pkg.length}×${draft.pkg.width}×${draft.pkg.height} ${units.length.toLowerCase()} · ${draft.pkg.weight} ${units.weight.toLowerCase()} · ${draft.incoterm}`,
    rate ? `${rate.serviceName} · ${money(rate.total, rate.currency)}` : null,
    null,
  ]

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Create shipment</h1>
        <Button variant="ghost" onClick={startOver}>
          Discard
        </Button>
      </div>
      <WizardStepper steps={CREATE_STEPS} current={draft.step} summaries={summaries} onGoTo={(index) => dispatch({ type: 'goTo', step: index as WizardStep })} />

      {draft.step === 0 && <AddressStep draft={draft} dispatch={dispatch} addresses={addresses} loadingAddresses={loadingAddresses} shipFrom={shipFrom} onCancel={() => router.push(BOOKINGS_HREF)} />}
      {draft.step === 1 && <ShipmentStep draft={draft} dispatch={dispatch} errors={errors} lane={crossBorder ? `${shipFrom?.countryCode} → ${draft.shipTo.address.country}` : null} />}
      {draft.step === 2 && (
        <RatesStep
          stream={stream}
          incoterm={draft.incoterm}
          selectedRateId={draft.selectedRateId}
          onSelect={(rateId) => dispatch({ type: 'selectRate', rateId })}
          onRetry={refetchRates}
          onBack={() => dispatch({ type: 'goTo', step: 1 })}
          onContinue={() => dispatch({ type: 'goTo', step: 3 })}
        />
      )}
      {draft.step === 3 && shipFrom && rate && stream.quoteId && (
        <BookingStep draft={draft} dispatch={dispatch} shipFrom={shipFrom} rate={rate} quoteId={stream.quoteId} onBooked={setBooked} onQuoteExpired={refetchRates} />
      )}
    </>
  )
}
