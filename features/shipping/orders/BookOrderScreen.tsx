'use client'

import React, { useEffect, useMemo, useReducer, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetShipFromAddressesQuery } from '@/services/api/shipFromAddresses.api'
import { useGetChannelOrderQuery } from '@/services/api/shipping.api'
import { ShipFromSection, ShipToSection, useAddressErrors } from '../create/AddressStep'
import { BookingConfirmed } from '../create/BookingConfirmed'
import { BookingStep } from '../create/BookingStep'
import { CustomsCard } from '../create/CustomsCard'
import { PackageCard } from '../create/PackageCard'
import { RatesStep } from '../create/RatesStep'
import { draftReducer, INITIAL_DRAFT, type WizardStep } from '../create/shipmentDraft'
import { fieldCount, isCrossBorder, shipmentErrors, type FieldErrors } from '../create/shipmentRules'
import { ShipmentOptionsCards } from '../create/ShipmentOptionsCards'
import { useDraftRates } from '../create/useDraftRates'
import { WizardFooter } from '../create/WizardFooter'
import { ORDER_STEPS, WizardStepper } from '../create/WizardStepper'
import { FULFILLMENT_META, money, ORDERS_HREF } from '../shippingMeta'
import type { ChannelId, ChannelOrderRef, ParcelShipmentDto } from '../types'
import { draftFromOrder } from './orderDraft'
import { OrderSummaryCard } from './OrderSummaryCard'

/** Which parts of the order needed details when it was opened; they stay on screen while being filled. */
interface DetailSections {
  shipFrom: boolean
  shipTo: boolean
  pkg: boolean
  customs: boolean
}

const ADDRESS_KEYS = ['name', 'address1', 'country', 'province', 'city', 'postalCode', 'phone', 'email']

function sectionsOf(errors: FieldErrors, shipToError: string | null): DetailSections {
  const keys = Object.keys(errors)
  return {
    shipFrom: 'shipFrom' in errors,
    shipTo: Boolean(shipToError) || keys.some((key) => ADDRESS_KEYS.includes(key)),
    pkg: keys.some((key) => key.startsWith('pkg.')),
    customs: keys.some((key) => key.startsWith('customs.') || key.startsWith('qty.')),
  }
}

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
 * Shipping › Orders › Get rates: one channel order through Rates › Booking. The draft is built from the order;
 * anything missing (unmapped SKU, HS code, dimensions, address) is asked for in "Complete these details", and
 * rates stream once it is complete and again after each edit. Booking sends the order, so it is marked shipped.
 */
export const BookOrderScreen: React.FC = () => {
  const router = useRouter()
  const canWrite = useAppAbility().can('write', 'shipping:parcels')
  const orderRef = useOrderRef()
  const { data: detail, isLoading, isError } = useGetChannelOrderQuery(orderRef ?? { channel: 'walmart', market: '', orderId: '' }, { skip: !orderRef })
  const { data: addresses = [], isLoading: loadingAddresses } = useGetShipFromAddressesQuery()
  const [draft, dispatch] = useReducer(draftReducer, INITIAL_DRAFT)
  const [loaded, setLoaded] = useState(false)
  const [sections, setSections] = useState<DetailSections | null>(null)
  const [booked, setBooked] = useState<ParcelShipmentDto | null>(null)

  const shipFrom = addresses.find((address) => address.id === draft.shipFromId)
  const crossBorder = isCrossBorder(draft, shipFrom)
  const addressErrors = useAddressErrors(draft)
  const errors = useMemo<FieldErrors>(() => ({ ...addressErrors, ...shipmentErrors(draft, crossBorder) }), [addressErrors, draft, crossBorder])
  const missing = fieldCount(errors)
  const ready = loaded && missing === 0 && !errors.products
  const { stream, rate, refetch } = useDraftRates(draft, dispatch, crossBorder, { enabled: ready, debounceMs: 600 })

  // The draft is built once, when the order and the ship-from addresses are in
  useEffect(() => {
    if (loaded || !detail || loadingAddresses) return
    const fallback = addresses.find((address) => address.isDefault) ?? (addresses.length === 1 ? addresses[0] : undefined)
    dispatch({ type: 'load', draft: draftFromOrder(detail, fallback?.id ?? '') })
    setLoaded(true)
  }, [loaded, detail, loadingAddresses, addresses])

  // A section that ever needed details stays listed, so it doesn't vanish under the cursor once it is fixed
  // (customs lines only become required when the ship-to country makes the shipment cross-border)
  useEffect(() => {
    if (!loaded || !detail) return
    const current = sectionsOf(errors, detail.shipToError)
    setSections((previous) => {
      const merged: DetailSections = {
        shipFrom: Boolean(previous?.shipFrom || current.shipFrom),
        shipTo: Boolean(previous?.shipTo || current.shipTo),
        pkg: Boolean(previous?.pkg || current.pkg),
        customs: Boolean(previous?.customs || current.customs),
      }
      return previous && (Object.keys(merged) as (keyof DetailSections)[]).every((key) => merged[key] === previous[key]) ? previous : merged
    })
  }, [loaded, detail, errors])

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

  const step = draft.step === 3 ? 1 : 0
  // Every section that has needed details so far, plus any that need them on this render
  const current = sectionsOf(errors, detail.shipToError)
  const shown: DetailSections = {
    shipFrom: Boolean(sections?.shipFrom || current.shipFrom),
    shipTo: Boolean(sections?.shipTo || current.shipTo),
    pkg: Boolean(sections?.pkg || current.pkg),
    customs: Boolean(sections?.customs || current.customs || crossBorder),
  }
  const needsDetails = Object.values(shown).some(Boolean)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Book order {detail.order.orderId}</h1>
        <Link href={ORDERS_HREF} className="ds-button ds-button-ghost ds-button-md">
          ← Orders
        </Link>
      </div>
      <WizardStepper steps={ORDER_STEPS} current={step} summaries={[rate ? `${rate.serviceName} · ${money(rate.total, rate.currency)}` : null, null]} onGoTo={(index) => dispatch({ type: 'goTo', step: (index + 2) as WizardStep })} />

      {draft.step === 2 && (
        <div className="space-y-4">
          <OrderSummaryCard detail={detail} />
          <ShipmentOptionsCards options={draft} errors={errors} destination={draft.shipTo.address.country} dispatch={dispatch} />

          {needsDetails && (
            <section className="space-y-4 rounded-lg border border-warning-300 bg-warning-50/40 p-4">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Complete these details</h2>
                <p className="text-xs text-text-muted">{missing > 0 ? `Fill the ${missing} highlighted ${missing === 1 ? 'field' : 'fields'} to get rates.` : 'All set: rates are on their way.'}</p>
              </div>
              {shown.shipTo && detail.shipToError && <Alert variant="danger">{detail.shipToError}</Alert>}
              {(shown.shipFrom || shown.shipTo) && (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  {shown.shipFrom && <ShipFromSection draft={draft} dispatch={dispatch} shown={errors} addresses={addresses} loadingAddresses={loadingAddresses} shipFrom={shipFrom} />}
                  {shown.shipTo && <ShipToSection draft={draft} dispatch={dispatch} shown={errors} />}
                </div>
              )}
              {shown.pkg && <PackageCard draft={draft} errors={errors} dispatch={dispatch} />}
              {shown.customs && <CustomsCard draft={draft} errors={errors} lane={crossBorder ? `${shipFrom?.countryCode} → ${draft.shipTo.address.country}` : null} dispatch={dispatch} />}
            </section>
          )}

          {ready ? (
            <RatesStep
              stream={stream}
              incoterm={draft.incoterm}
              selectedRateId={draft.selectedRateId}
              onSelect={(rateId) => dispatch({ type: 'selectRate', rateId })}
              onRetry={refetch}
              onBack={backToOrders}
              onContinue={() => dispatch({ type: 'goTo', step: 3 })}
            />
          ) : (
            <WizardFooter
              start={
                <Button variant="outline" onClick={backToOrders}>
                  ← Orders
                </Button>
              }
              hint={<span className="text-danger-600">Complete the highlighted details to get rates</span>}
            >
              <Button disabled>Continue to Booking →</Button>
            </WizardFooter>
          )}
        </div>
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
