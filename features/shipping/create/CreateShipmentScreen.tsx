'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormProvider } from 'react-hook-form'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useDeleteShipmentDraftMutation, useGetShipFromOptionsQuery, useGetShipmentDraftQuery, useSaveShipmentDraftMutation } from '@/services/api/shipping.api'
import { CHANNEL_LABEL, money, ORDERS_LIST_HREF } from '../shippingMeta'
import type { ParcelShipmentDto } from '../types'
import { AddressStep, defaultShipFrom } from './AddressStep'
import { BookingConfirmed } from './BookingConfirmed'
import { BookingStep } from './BookingStep'
import { ProductsCard } from './ProductsCard'
import { RatesStep } from './RatesStep'
import { UNITS, type WizardStep } from './shipmentForm'
import { ShipmentStep } from './ShipmentStep'
import { useShipmentForm } from './useShipmentForm'
import { useLeaveGuard } from './useLeaveGuard'
import { CREATE_STEPS, WizardStepper } from './WizardStepper'
import type { ShipmentFormValues } from './shipmentSchema'

/**
 * Shipping › Create shipment: Address Info › Shipment Info › Rates › Booking. The whole shipment lives in one
 * react-hook-form form, so going back keeps everything; any change to what is quoted makes the rates stale and
 * they are fetched again.
 */
export const CreateShipmentScreen: React.FC = () => {
  const router = useRouter()
  const canWrite = useAppAbility().can('write', 'shipping:orders')
  const params = useSearchParams()
  const { success, failure } = useApiFeedback()
  const [booked, setBookedShipment] = useState<ParcelShipmentDto | null>(null)
  // The draft this shipment was opened from or saved as (`?draft=12`): saving again updates it
  const [draftId, setDraftId] = useState<number | null>(Number(params.get('draft')) || null)
  const [saveDraft] = useSaveShipmentDraftMutation()
  const [deleteDraft] = useDeleteShipmentDraftMutation()
  const { data: addresses = [], isLoading: loadingAddresses } = useGetShipFromOptionsQuery()
  // A manual shipment says which platform and marketplace it is for
  const wizard = useShipmentForm(addresses, { requirePlatform: true })
  const { form, values, step, setStep, shipFrom, crossBorder, rate, stream } = wizard

  // Opening a saved draft fills the form once, at the step it was left on
  const { data: draft, isError: draftMissing } = useGetShipmentDraftQuery(draftId ?? 0, { skip: !draftId })
  const loadedDraft = useRef<number | null>(null)
  useEffect(() => {
    if (!draft || loadedDraft.current === draft.id) return
    loadedDraft.current = draft.id
    const { wizardStep, ...saved } = draft.values as ShipmentFormValues & { wizardStep?: number }
    // Rates and quotes expire, so a draft resumes at most at Shipment Info
    wizard.load(saved as ShipmentFormValues, Math.min(Number(wizardStep) || 0, 1) as WizardStep)
  }, [draft, wizard])
  useEffect(() => {
    if (draftMissing) failure(null, 'This draft is no longer available.')
  }, [draftMissing, failure])

  /** Saves what is on screen as a manual draft; true when it was saved. */
  const saveAsDraft = useCallback(async () => {
    try {
      const saved = await saveDraft({ id: draftId, values: { ...form.getValues(), wizardStep: step } }).unwrap()
      setDraftId(saved.id)
      form.reset(form.getValues()) // saved: nothing is unsaved now
      success(`Saved as ${saved.draftNo}. Find it in Orders with the Draft status.`)
      return true
    } catch (error) {
      failure(error, 'Could not save the draft')
      return false
    }
  }, [saveDraft, draftId, form, step, success, failure])

  const setBooked = (shipment: ParcelShipmentDto | null) => {
    setBookedShipment(shipment)
    // Booked: the draft it came from is done with
    if (shipment && draftId) void deleteDraft(draftId).unwrap().then(() => setDraftId(null)).catch(() => undefined)
  }

  const unsaved = form.formState.isDirty && !booked
  const { dialog: leaveDialog } = useLeaveGuard({ active: unsaved, onSave: saveAsDraft })

  // The first warehouse (else the default address) is picked up front
  useEffect(() => {
    const fallback = defaultShipFrom(addresses)
    if (!values.shipFromId && fallback) form.setValue('shipFromId', fallback.id)
  }, [addresses, values.shipFromId, form])

  const startOver = () => {
    setBookedShipment(null)
    setDraftId(null)
    loadedDraft.current = null
    wizard.startOver()
  }

  if (!canWrite) return <Alert variant="info">You can see the bookings, but creating shipments needs the Shipping write permission.</Alert>
  if (draftId && !draft && !draftMissing) return <div className="flex justify-center p-16"><Spinner size="lg" /></div>
  if (booked) return <BookingConfirmed shipment={booked} onShipmentChange={setBooked} next={{ label: 'Create another shipment', onClick: startOver }} />

  const units = UNITS[values.units]
  const platform = values.platform.channel ? `${CHANNEL_LABEL[values.platform.channel]} ${values.platform.market === 'ca' ? 'Canada' : values.platform.market === 'us' ? 'USA' : ''}`.trim() : null
  const summaries = [
    shipFrom && values.shipTo.address.city ? `${platform ? `${platform} · ` : ''}${shipFrom.city} → ${values.shipTo.address.city}, ${values.shipTo.address.province}` : null,
    `1 pkg · ${values.pkg.length}×${values.pkg.width}×${values.pkg.height} ${units.length.toLowerCase()} · ${values.pkg.weight} ${units.weight.toLowerCase()} · ${values.incoterm}`,
    rate ? `${rate.serviceName} · ${money(rate.total, rate.currency)}` : null,
    null,
  ]

  return (
    <FormProvider {...form}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-primary">Create shipment</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void saveAsDraft()} disabled={!unsaved && !draftId}>
            Save draft
          </Button>
          <Button variant="ghost" onClick={startOver}>
            Discard
          </Button>
        </div>
      </div>
      {leaveDialog}
      <WizardStepper steps={CREATE_STEPS} current={step} summaries={summaries} onGoTo={(index) => setStep(index as WizardStep)} />

      {step === 0 && <AddressStep addresses={addresses} loadingAddresses={loadingAddresses} shipFrom={shipFrom} onCancel={() => router.push(ORDERS_LIST_HREF)} onContinue={() => void wizard.continueFromAddress()} showPlatform />}
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
          channel={values.platform.channel && values.platform.market ? { channel: values.platform.channel, market: values.platform.market } : undefined}
        />
      )}
    </FormProvider>
  )
}
