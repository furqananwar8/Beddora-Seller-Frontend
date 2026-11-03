'use client'

import React, { useEffect, useMemo, useReducer, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert } from '@/design-system/alerts'
import { Spinner } from '@/design-system/loaders'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetChannelOrderQuery, useGetShipFromOptionsQuery } from '@/services/api/shipping.api'
import { defaultShipFrom, SHIP_TO_KEYS, ShipFromSection, ShipToSection, useAddressErrors } from '../create/AddressStep'
import { BookingConfirmed } from '../create/BookingConfirmed'
import { BookingStep } from '../create/BookingStep'
import { RatesStep } from '../create/RatesStep'
import { draftReducer, newDraft, type WizardStep } from '../create/shipmentDraft'
import { isCrossBorder, shipmentErrors, type FieldErrors } from '../create/shipmentRules'
import { ShipmentStep } from '../create/ShipmentStep'
import { useDraftRates } from '../create/useDraftRates'
import { ORDER_STEPS, WizardStepper } from '../create/WizardStepper'
import { FULFILLMENT_META, money, ORDERS_HREF } from '../shippingMeta'
import type { ChannelId, ChannelOrderRef, ParcelShipmentDto } from '../types'
import { draftFromOrder } from './orderDraft'
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
 * Shipping › Orders › Get rates: one channel order through Shipment Info › Rates › Booking. The draft is built from
 * the order and our products (SKU Mapper binding, else the same SKU): addresses, products, carton, customs. Shipment
 * Info always shows it all for review and edits, with anything still missing highlighted; rates are only fetched
 * when the user asks. Booking sends the order, so it is marked shipped.
 */
export const BookOrderScreen: React.FC = () => {
  const router = useRouter()
  const canWrite = useAppAbility().can('write', 'shipping:parcels')
  const orderRef = useOrderRef()
  const { data: detail, isLoading, isError } = useGetChannelOrderQuery(orderRef ?? { channel: 'walmart', market: '', orderId: '' }, { skip: !orderRef })
  const { data: addresses = [], isLoading: loadingAddresses } = useGetShipFromOptionsQuery()
  const [draft, dispatch] = useReducer(draftReducer, undefined, newDraft)
  const [loaded, setLoaded] = useState(false)
  const [booked, setBooked] = useState<ParcelShipmentDto | null>(null)

  const shipFrom = addresses.find((address) => address.id === draft.shipFromId)
  const crossBorder = isCrossBorder(draft, shipFrom)
  const addressErrors = useAddressErrors(draft)
  const errors = useMemo<FieldErrors>(() => ({ ...addressErrors, ...shipmentErrors(draft, crossBorder) }), [addressErrors, draft, crossBorder])
  // rates stream on entering the Rates step, and again after the details were edited
  const { stream, rate, refetch } = useDraftRates(draft, dispatch, crossBorder)

  // The draft is built once, when the order and the ship-from addresses are in
  useEffect(() => {
    if (loaded || !detail || loadingAddresses) return
    dispatch({ type: 'load', draft: draftFromOrder(detail, defaultShipFrom(addresses)?.id ?? '') })
    setLoaded(true)
  }, [loaded, detail, loadingAddresses, addresses])

  const backToOrders = () => router.push(ORDERS_HREF)

  if (!canWrite) return <Alert variant="info">Booking orders needs the Shipping write permission.</Alert>
  if (!orderRef) return <Alert variant="danger">No order picked. Open one from the Orders list.</Alert>
  if (booked) return <BookingConfirmed shipment={booked} onShipmentChange={setBooked} next={{ label: 'Back to Orders', onClick: backToOrders }} />
  if (isLoading || (detail && !loaded))
    return (
      <div className="flex justify-center p-10">
        <Spinner size="sm" />
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

  // the order flow has no Address step: draft steps 1-3 are stepper steps 0-2
  const step = Math.max(draft.step - 1, 0)
  const shipToProblems = SHIP_TO_KEYS.map((key) => errors[key]).filter(Boolean)
  const lane = crossBorder ? `${shipFrom?.countryCode} → ${draft.shipTo.address.country}` : null

  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-text-primary sm:text-2xl">Book order {detail.order.orderId}</h1>
      <WizardStepper
        steps={ORDER_STEPS}
        current={step}
        summaries={[shipFrom && draft.shipTo.address.city ? `${shipFrom.city} → ${draft.shipTo.address.city}` : null, rate ? `${rate.serviceName} · ${money(rate.total, rate.currency)}` : null, null]}
        onGoTo={(index) => dispatch({ type: 'goTo', step: (index + 1) as WizardStep })}
      />

      {draft.step === 1 && (
        <div className="space-y-4">
          <OrderSummaryCard detail={detail} />
          {detail.shipToError && <Alert variant="danger">{detail.shipToError}</Alert>}
          {/* the channel's ship-to (in the order card above) is final; it is only typed in when the channel shared none */}
          {detail.shipTo && shipToProblems.length > 0 && (
            <Alert variant="danger">
              {detail.order.channelLabel} didn&apos;t send everything carriers need for the ship-to address: {shipToProblems.join(', ')}.
            </Alert>
          )}
          {detail.shipTo ? (
            <ShipFromSection draft={draft} dispatch={dispatch} shown={errors} addresses={addresses} loadingAddresses={loadingAddresses} shipFrom={shipFrom} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <ShipFromSection draft={draft} dispatch={dispatch} shown={errors} addresses={addresses} loadingAddresses={loadingAddresses} shipFrom={shipFrom} />
              <ShipToSection draft={draft} dispatch={dispatch} shown={errors} />
            </div>
          )}
          <ShipmentStep draft={draft} dispatch={dispatch} errors={errors} lane={lane} onBack={backToOrders} backLabel="Back to orders" />
        </div>
      )}

      {draft.step === 2 && (
        <RatesStep
          stream={stream}
          incoterm={draft.incoterm}
          selectedRateId={draft.selectedRateId}
          onSelect={(rateId) => dispatch({ type: 'selectRate', rateId })}
          onRetry={refetch}
          onBack={() => dispatch({ type: 'goTo', step: 1 })}
          onContinue={() => dispatch({ type: 'goTo', step: 3 })}
        />
      )}

      {draft.step === 3 && shipFrom && rate && stream.quoteId && (
        <BookingStep
          draft={draft}
          dispatch={dispatch}
          shipFrom={shipFrom}
          rate={rate}
          quoteId={stream.quoteId}
          order={orderRef}
          editable={false}
          onBooked={setBooked}
          onQuoteExpired={refetch}
          onOrderNotBookable={backToOrders}
        />
      )}
    </>
  )
}
