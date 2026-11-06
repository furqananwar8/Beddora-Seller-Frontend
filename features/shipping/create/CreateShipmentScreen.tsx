'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormProvider } from 'react-hook-form'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetShipFromOptionsQuery } from '@/services/api/shipping.api'
import { BOOKINGS_HREF, money } from '../shippingMeta'
import type { ParcelShipmentDto } from '../types'
import { AddressStep, defaultShipFrom } from './AddressStep'
import { BookingConfirmed } from './BookingConfirmed'
import { BookingStep } from './BookingStep'
import { ProductsCard } from './ProductsCard'
import { RatesStep } from './RatesStep'
import { UNITS, type WizardStep } from './shipmentForm'
import { ShipmentStep } from './ShipmentStep'
import { useShipmentForm } from './useShipmentForm'
import { CREATE_STEPS, WizardStepper } from './WizardStepper'

/**
 * Shipping › Create shipment: Address Info › Shipment Info › Rates › Booking. The whole shipment lives in one
 * react-hook-form form, so going back keeps everything; any change to what is quoted makes the rates stale and
 * they are fetched again.
 */
export const CreateShipmentScreen: React.FC = () => {
  const router = useRouter()
  const canWrite = useAppAbility().can('write', 'shipping:parcels')
  const [booked, setBooked] = useState<ParcelShipmentDto | null>(null)
  const { data: addresses = [], isLoading: loadingAddresses } = useGetShipFromOptionsQuery()
  const wizard = useShipmentForm(addresses)
  const { form, values, step, setStep, shipFrom, crossBorder, rate, stream } = wizard

  // The first warehouse (else the default address) is picked up front
  useEffect(() => {
    const fallback = defaultShipFrom(addresses)
    if (!values.shipFromId && fallback) form.setValue('shipFromId', fallback.id)
  }, [addresses, values.shipFromId, form])

  const startOver = () => {
    setBooked(null)
    wizard.startOver()
  }

  if (!canWrite) return <Alert variant="info">You can see the bookings, but creating shipments needs the Shipping write permission.</Alert>
  if (booked) return <BookingConfirmed shipment={booked} onShipmentChange={setBooked} next={{ label: 'Create another shipment', onClick: startOver }} />

  const units = UNITS[values.units]
  const summaries = [
    shipFrom && values.shipTo.address.city ? `${shipFrom.city} → ${values.shipTo.address.city}, ${values.shipTo.address.province}` : null,
    `1 pkg · ${values.pkg.length}×${values.pkg.width}×${values.pkg.height} ${units.length.toLowerCase()} · ${values.pkg.weight} ${units.weight.toLowerCase()} · ${values.incoterm}`,
    rate ? `${rate.serviceName} · ${money(rate.total, rate.currency)}` : null,
    null,
  ]

  return (
    <FormProvider {...form}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Create shipment</h1>
        <Button variant="ghost" onClick={startOver}>
          Discard
        </Button>
      </div>
      <WizardStepper steps={CREATE_STEPS} current={step} summaries={summaries} onGoTo={(index) => setStep(index as WizardStep)} />

      {step === 0 && <AddressStep addresses={addresses} loadingAddresses={loadingAddresses} shipFrom={shipFrom} onCancel={() => router.push(BOOKINGS_HREF)} onContinue={() => void wizard.continueFromAddress()} />}
      {step === 1 && (
        <ShipmentStep
          lane={crossBorder ? `${shipFrom?.countryCode} → ${values.shipTo.address.country}` : null}
          products={<ProductsCard />}
          onUnitsChange={wizard.changeUnits}
          onGetRates={() => void wizard.goToRates()}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <RatesStep
          stream={stream}
          incoterm={values.incoterm}
          selectedRateId={wizard.selectedRateId}
          onSelect={wizard.setSelectedRateId}
          onRetry={wizard.refetchRates}
          onBack={() => setStep(1)}
          onContinue={() => setStep(3)}
        />
      )}
      {step === 3 && shipFrom && rate && stream.quoteId && (
        <BookingStep
          values={values}
          labelFormat={wizard.labelFormat}
          onLabelFormatChange={wizard.setLabelFormat}
          onGoTo={setStep}
          shipFrom={shipFrom}
          rate={rate}
          quoteId={stream.quoteId}
          onBooked={setBooked}
          onQuoteExpired={wizard.refetchRates}
        />
      )}
    </FormProvider>
  )
}
