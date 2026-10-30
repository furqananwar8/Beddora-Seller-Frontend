'use client'

import React, { useEffect, useRef } from 'react'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import type { SavedShipFromAddress } from '@/features/inventory/shipments/types'
import { useBookShipmentMutation } from '@/services/api/shipping.api'
import { useLabelFormats } from '../shared/useLabelFormats'
import { CartonIllustration } from '../shared/CartonIllustration'
import { SectionCard } from '../shared/Card'
import { PriceBreakdownTable } from '../shared/PriceBreakdownTable'
import { ProviderLogo } from '../shared/ProviderLogo'
import { RadioCards } from '../shared/RadioCards'
import { apiErrorCode, HANDOVER_META, INCOTERM_META, money, transitDays } from '../shippingMeta'
import type { ChannelOrderRef, ParcelShipmentDto, Rate } from '../types'
import { numberOf, UNITS, type DraftAction, type ShipmentDraft, type WizardStep } from './shipmentDraft'
import { WizardFooter } from './WizardFooter'

interface BookingStepProps {
  draft: ShipmentDraft
  dispatch: React.Dispatch<DraftAction>
  shipFrom: SavedShipFromAddress
  rate: Rate
  quoteId: string
  onBooked: (shipment: ParcelShipmentDto) => void
  /** 409 QUOTE_EXPIRED: back to Rates, re-quoted. */
  onQuoteExpired: () => void
  /** Booking a channel order: sent with the booking, and the order is marked shipped on its channel. */
  order?: ChannelOrderRef
  /** 409 ORDER_NOT_BOOKABLE: the order was booked, shipped or cancelled meanwhile. */
  onOrderNotBookable?: () => void
  /** Offer Edit links back to Address Info / Shipment Info (the manual flow has them). */
  editable?: boolean
}

const isConflict = (error: unknown, code: string) => (error as { status?: number } | undefined)?.status === 409 && apiErrorCode(error) === code
const isQuoteExpired = (error: unknown) => isConflict(error, 'QUOTE_EXPIRED')

/** One review block with an Edit link back to its step. */
const ReviewItem: React.FC<{ label: string; onEdit?: () => void; children: React.ReactNode }> = ({ label, onEdit, children }) => (
  <div className="text-sm leading-6">
    <div className="flex items-center gap-2 text-xs text-text-muted">
      {label}
      {onEdit && (
        <button type="button" onClick={onEdit} className="text-primary-600 underline">
          Edit
        </button>
      )}
    </div>
    {children}
  </div>
)

/** Step 4: review, label format, price, and Book & buy label. */
export const BookingStep: React.FC<BookingStepProps> = ({ draft, dispatch, shipFrom, rate, quoteId, onBooked, onQuoteExpired, order, onOrderNotBookable, editable = true }) => {
  const { failure, info } = useApiFeedback()
  const [book, { isLoading, error }] = useBookShipmentMutation()
  const formats = useLabelFormats(rate.provider)
  const labelFormat = formats.some((option) => option.id === draft.labelFormat) ? draft.labelFormat : null

  // Default to the provider's first format until one is picked
  useEffect(() => {
    if (!labelFormat && formats[0]) dispatch({ type: 'setLabelFormat', format: formats[0].id })
  }, [labelFormat, formats, dispatch])

  // One key per attempt (quote, rate, format): a retry of the same attempt resends it, so it can't book twice
  const attempt = useRef<{ signature: string; key: string } | null>(null)
  const idempotencyKey = (signature: string) => {
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() }
    return attempt.current.key
  }

  const submit = async () => {
    if (!labelFormat) return
    const body = { quoteId, rateId: rate.rateId, labelFormat, order }
    try {
      const shipment = await book({ body, idempotencyKey: idempotencyKey(JSON.stringify(body)) }).unwrap()
      attempt.current = null
      onBooked(shipment)
    } catch (err) {
      if (isQuoteExpired(err)) {
        info('The quote expired, so the rates are fetched again. Pick the service once more.')
        onQuoteExpired()
      } else if (onOrderNotBookable && isConflict(err, 'ORDER_NOT_BOOKABLE')) {
        failure(err, 'This order can no longer be booked')
        onOrderNotBookable()
      } else failure(err, 'Could not book the shipment')
    }
  }

  const edit = (step: WizardStep) => () => dispatch({ type: 'goTo', step })
  const editTo = (step: WizardStep) => (editable ? edit(step) : undefined)
  const units = UNITS[draft.units]
  const pkg = draft.pkg
  const unitCount = draft.products.reduce((sum, item) => sum + (numberOf(item.quantity) ?? 0), 0)
  const declared = draft.products.reduce((sum, { product, quantity }) => sum + (numberOf(draft.customs[product.id]?.unitValue ?? '') ?? 0) * (numberOf(quantity) ?? 0), 0)
  const declaredCurrency = draft.products[0] ? draft.customs[draft.products[0].product.id]?.currency : undefined
  const { shipTo } = draft
  const days = transitDays(rate)

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <SectionCard title="Review" subtitle={editable ? 'click a section to edit it' : undefined}>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReviewItem label="From" onEdit={editTo(0)}>
                <b>{shipFrom.label}</b>
                <br />
                {[shipFrom.addressLine1, shipFrom.addressLine2, `${shipFrom.city} ${shipFrom.stateOrProvinceCode ?? ''} ${shipFrom.postalCode}`, shipFrom.countryCode].filter(Boolean).join(', ')}
              </ReviewItem>
              <ReviewItem label="To" onEdit={editTo(0)}>
                <b>{shipTo.name}</b> · {shipTo.residential ? 'residential' : 'business'}
                <br />
                {[shipTo.address1, shipTo.address2, `${shipTo.address.city} ${shipTo.address.province} ${shipTo.address.postalCode}`, shipTo.address.country].filter(Boolean).join(', ')}
              </ReviewItem>
              <ReviewItem label="Package" onEdit={editTo(1)}>
                <div className="flex items-center gap-3">
                  <CartonIllustration bare length={numberOf(pkg.length)} width={numberOf(pkg.width)} height={numberOf(pkg.height)} unit={units.length} className="h-14 w-20 shrink-0" />
                  <span>
                    <b>
                      {pkg.length} × {pkg.width} × {pkg.height} {units.length.toLowerCase()} · {pkg.weight} {units.weight.toLowerCase()}
                    </b>
                    <span className="block text-xs text-text-muted">
                      {unitCount} {unitCount === 1 ? 'unit' : 'units'} · {draft.products.length} {draft.products.length === 1 ? 'SKU' : 'SKUs'}
                      {declared > 0 && declaredCurrency && ` · declared ${money(declared, declaredCurrency)}`}
                    </span>
                  </span>
                </div>
              </ReviewItem>
              <ReviewItem label="Options" onEdit={editTo(1)}>
                {draft.incoterm} ({INCOTERM_META[draft.incoterm].description.toLowerCase()}) · {HANDOVER_META[draft.handover].title}
                {draft.handover === 'PICKUP' && ` ${draft.pickupDate}`}
                <br />
                {[draft.signature && 'Signature', draft.insurance && `Insurance CAD ${draft.insurance}`, draft.reference && `Ref ${draft.reference}`].filter(Boolean).join(' · ') || <span className="text-text-muted">No extras</span>}
              </ReviewItem>
            </div>
          </SectionCard>

          <SectionCard title="Label format" subtitle="can be changed again when re-printing">
            {formats.length === 0 ? (
              <p className="text-sm text-text-muted">Loading the formats this provider supports…</p>
            ) : (
              <RadioCards
                name="label-format"
                ariaLabel="Label format"
                options={formats.map((option) => ({ value: option.id, title: option.label, description: option.description }))}
                value={labelFormat}
                onChange={(format) => dispatch({ type: 'setLabelFormat', format })}
              />
            )}
          </SectionCard>
        </div>

        <SectionCard
          title={
            <span className="flex items-center gap-3">
              <ProviderLogo provider={rate.provider} />
              <span>
                {rate.serviceName}
                <span className="block text-xs font-normal text-text-muted">
                  {rate.providerLabel}
                  {days && ` · ${days} working days`}
                </span>
              </span>
            </span>
          }
        >
          <PriceBreakdownTable price={rate} incoterm={draft.incoterm} total={rate.total} currency={rate.currency} />
          {error !== undefined && !isQuoteExpired(error) && !isConflict(error, 'ORDER_NOT_BOOKABLE') && (
            <Alert variant="danger" className="mt-3">
              The booking did not go through. Trying again is safe: it won&apos;t book twice.
            </Alert>
          )}
          <Button className="mt-4 w-full" onClick={() => void submit()} isLoading={isLoading} disabled={!labelFormat}>
            Book &amp; buy label · {money(rate.total, rate.currency)}
          </Button>
          <p className="mt-2 text-xs text-text-muted">Quotes are valid for 30 minutes; an expired one is fetched again automatically.</p>
        </SectionCard>
      </div>

      <WizardFooter
        start={
          <Button variant="outline" onClick={edit(2)}>
            ← Back to rates
          </Button>
        }
      >
        {null}
      </WizardFooter>
    </>
  )
}
