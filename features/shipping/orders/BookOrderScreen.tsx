'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormProvider } from 'react-hook-form'
import { Alert } from '@/design-system/alerts'
import { Spinner } from '@/design-system/loaders'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetChannelOrderQuery, useGetShipFromOptionsQuery } from '@/services/api/shipping.api'
import { defaultShipFrom, ShipFromSection, ShipToSection } from '../create/AddressStep'
import { BookingConfirmed } from '../create/BookingConfirmed'
import { BookingStep } from '../create/BookingStep'
import { RatesStep } from '../create/RatesStep'
import type { WizardStep } from '../create/shipmentForm'
import { ShipmentStep } from '../create/ShipmentStep'
import { useShipmentForm } from '../create/useShipmentForm'
import { ORDER_STEPS, WizardStepper } from '../create/WizardStepper'
import { FULFILLMENT_META, money, ORDERS_HREF } from '../shippingMeta'
import type { ChannelId, ChannelOrderRef, ParcelShipmentDto } from '../types'
import { unmappedLines, valuesFromOrder } from './orderDraft'
import { OrderProductsCard } from './OrderProductsCard'
import { OrderSummaryCard } from './OrderSummaryCard'

const CHANNELS: ChannelId[] = ['walmart', 'amazon', 'temu']

/** `?channel=walmart&market=US&orderId=…`, or null when incomplete. */
function useOrderRef(): ChannelOrderRef | null {
  const params = useSearchParams()
  const channel = params.get('channel') as ChannelId | null
  const market = params.get('market')
  const orderId = params.get('orderId')
  return channel && CHANNELS.includes(channel) && market && orderId ? { channel, market, orderId } : null
}

/**
 * Shipping › Orders › Get rates: one channel order through Shipment Info › Rates › Booking. The form is filled
 * from the order and our products (SKU Mapper binding, else the same SKU): ship-to from the customer, the mapped
 * products (read-only), carton, customs. Shipment Info always shows it all for review, with anything still missing
 * highlighted; rates are only fetched when the user asks, and "Get rates" says in a toast what still blocks it. A
 * SKU that isn't one of our products must be mapped first. Booking sends the order, so it is marked shipped.
 */
export const BookOrderScreen: React.FC = () => {
  const router = useRouter()
  const canWrite = useAppAbility().can('write', 'shipping:parcels')
  const orderRef = useOrderRef()
  const { data: detail, isLoading, isError } = useGetChannelOrderQuery(orderRef ?? { channel: 'walmart', market: '', orderId: '' }, { skip: !orderRef })
  const { data: addresses = [], isLoading: loadingAddresses } = useGetShipFromOptionsQuery()
  const wizard = useShipmentForm(addresses)
  const { load } = wizard
  const { form, values, step, setStep, shipFrom, crossBorder, rate, stream } = wizard
  const [loaded, setLoaded] = useState(false)
  const [booked, setBooked] = useState<ParcelShipmentDto | null>(null)

  // The form is filled once, when the order and the ship-from addresses are in; step 1 is the first one shown
  useEffect(() => {
    if (loaded || !detail || loadingAddresses) return
    load(valuesFromOrder(detail, defaultShipFrom(addresses)?.id ?? ''), 1)
    setLoaded(true)
  }, [loaded, detail, loadingAddresses, addresses, load])

  // SKUs that aren't one of our products must be mapped (SKU Mapper) before rates can be fetched
  const unmapped = detail ? unmappedLines(detail) : []
  const unmappedSkus = unmapped.map((line) => line.sku)
  const blockedReason = unmapped.length
    ? `${unmappedSkus.join(', ')} ${unmapped.length === 1 ? 'needs' : 'need'} to be mapped to one of our products first. Map ${unmapped.length === 1 ? 'it' : 'them'} in the SKU Mapper, then get rates.`
    : undefined

  const backToOrders = () => router.push(ORDERS_HREF)

  if (!canWrite) return <Alert variant="info">Booking orders needs the Shipping write permission.</Alert>
  if (!orderRef) return <Alert variant="danger">No order picked. Open one from the Orders list.</Alert>
  if (booked) return <BookingConfirmed shipment={booked} onShipmentChange={setBooked} next={{ label: 'Back to Orders', onClick: backToOrders }} />
  if (isLoading || (detail && !loaded))
    return (
      <div className="flex justify-center p-16">
        <Spinner size="lg" />
      </div>
    )
  if (isError || !detail) return <Alert variant="danger">Could not load order {orderRef.orderId}.</Alert>
  if (detail.order.fulfillment !== 'TO_BOOK')
    return (
      <Alert variant="warning" className="flex flex-wrap items-center justify-between gap-2">
        Order {detail.order.orderId} is {FULFILLMENT_META[detail.order.fulfillment].label}: there is nothing to book.
        <Link href={ORDERS_HREF} className="ds-button ds-button-outline ds-button-sm">
          Back to Orders
        </Link>
      </Alert>
    )

  // the order flow has no Address step: form steps 1-3 are stepper steps 0-2
  const stepperStep = Math.max(step - 1, 0)

  return (
    <FormProvider {...form}>
      <h1 className="mb-4 text-xl font-bold text-text-primary sm:text-2xl">Book order {detail.order.orderId}</h1>
      <WizardStepper
        steps={ORDER_STEPS}
        current={stepperStep}
        summaries={[shipFrom && values.shipTo.address.city ? `${shipFrom.city} → ${values.shipTo.address.city}` : null, rate ? `${rate.serviceName} · ${money(rate.total, rate.currency)}` : null, null]}
        onGoTo={(index) => setStep((index + 1) as WizardStep)}
      />

      {step === 1 && (
        <div className="space-y-4">
          <OrderSummaryCard detail={detail} />
          {detail.shipToError && <Alert variant="warning">{detail.shipToError}</Alert>}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ShipFromSection addresses={addresses} loadingAddresses={loadingAddresses} shipFrom={shipFrom} />
            <ShipToSection />
          </div>
          <ShipmentStep
            lane={crossBorder ? `${shipFrom?.countryCode} → ${values.shipTo.address.country}` : null}
            products={<OrderProductsCard unmapped={unmapped} />}
            onUnitsChange={wizard.changeUnits}
            onGetRates={() => void wizard.goToRates(blockedReason)}
            onBack={backToOrders}
            backLabel="Back to orders"
          />
        </div>
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
          order={orderRef}
          editable={false}
          onBooked={setBooked}
          onQuoteExpired={wizard.refetchRates}
          onOrderNotBookable={backToOrders}
        />
      )}
    </FormProvider>
  )
}
