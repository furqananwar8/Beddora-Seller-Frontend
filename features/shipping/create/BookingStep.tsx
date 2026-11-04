'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import type { ShipFromOption } from '../types'
import { useBookShipmentMutation } from '@/services/api/shipping.api'
import { useLabelFormats } from '../shared/useLabelFormats'
import { CartonIllustration } from '../shared/CartonIllustration'
import { SectionCard } from '../shared/Card'
import { PriceBreakdownTable } from '../shared/PriceBreakdownTable'
import { CarrierLogo } from '../shared/CarrierLogo'
import { RadioCards } from '../shared/RadioCards'
import { apiErrorCode, INCOTERM_META, money, transitDays } from '../shippingMeta'
import type { ChannelOrderRef, LabelFormat, ParcelShipmentDto, Rate } from '../types'
import { numberOf, UNITS, type WizardStep } from './shipmentForm'
import type { ShipmentFormValues } from './shipmentSchema'
import { WizardFooter } from './WizardFooter'

interface BookingStepProps {
  values: ShipmentFormValues
  labelFormat: LabelFormat | null
  onLabelFormatChange: (format: LabelFormat) => void
  /** Back to a step (Edit links, Back to rates). */
  onGoTo: (step: WizardStep) => void
  shipFrom: ShipFromOption
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
export const BookingStep: React.FC<BookingStepProps> = ({ values, labelFormat: picked, onLabelFormatChange, onGoTo, shipFrom, rate, quoteId, onBooked, onQuoteExpired, order, onOrderNotBookable, editable = true }) => {
  const { failure, info } = useApiFeedback()
  const [book, { isLoading, error }] = useBookShipmentMutation()
  // Booking buys postage, so the button only asks; the booking is made once it is confirmed in the dialog
  const [confirming, setConfirming] = useState(false)
  const formats = useLabelFormats(rate.provider)
  const labelFormat = formats.some((option) => option.id === picked) ? picked : null

  // Default to the provider's first format until one is picked
  useEffect(() => {
    if (!labelFormat && formats[0]) onLabelFormatChange(formats[0].id)
  }, [labelFormat, formats, onLabelFormatChange])

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

  const confirmBooking = async () => {
    await submit()
    setConfirming(false)
  }

  const edit = (step: WizardStep) => () => onGoTo(step)
  const editTo = (step: WizardStep) => (editable ? edit(step) : undefined)
  const units = UNITS[values.units]
  const pkg = values.pkg
  const unitCount = values.products.reduce((sum, item) => sum + (numberOf(item.quantity) ?? 0), 0)
  const declared = values.products.reduce((sum, { quantity, customs }) => sum + (numberOf(customs.unitValue) ?? 0) * (numberOf(quantity) ?? 0), 0)
  const declaredCurrency = values.products[0]?.customs.currency
  const { shipTo } = values
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
                      {unitCount} {unitCount === 1 ? 'unit' : 'units'} · {values.products.length} {values.products.length === 1 ? 'SKU' : 'SKUs'}
                      {declared > 0 && declaredCurrency && ` · declared ${money(declared, declaredCurrency)}`}
                    </span>
                  </span>
                </div>
              </ReviewItem>
              <ReviewItem label="Options" onEdit={editTo(1)}>
                {values.incoterm} ({INCOTERM_META[values.incoterm].description.toLowerCase()}) · Pickup {values.pickupDate}
                <br />
                {[values.signature && 'Signature', values.insurance && `Insurance CAD ${values.insurance}`, values.reference && `Ref ${values.reference}`].filter(Boolean).join(' · ') || <span className="text-text-muted">No extras</span>}
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
                onChange={onLabelFormatChange}
              />
            )}
          </SectionCard>
        </div>

        <SectionCard
          title={
            <span className="flex items-center gap-3">
              <CarrierLogo carrier={rate.carrier} provider={rate.provider} />
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
          <PriceBreakdownTable price={rate} incoterm={values.incoterm} total={rate.total} currency={rate.currency} />
          {error !== undefined && !isQuoteExpired(error) && !isConflict(error, 'ORDER_NOT_BOOKABLE') && (
            <Alert variant="danger" className="mt-3">
              The booking did not go through. Trying again is safe: it won&apos;t book twice.
            </Alert>
          )}
          <Button className="mt-4 w-full" onClick={() => setConfirming(true)} isLoading={isLoading} disabled={!labelFormat}>
            Book &amp; buy label · {money(rate.total, rate.currency)}
          </Button>
          <p className="mt-2 text-xs text-text-muted">Quotes are valid for 30 minutes; an expired one is fetched again automatically.</p>
        </SectionCard>
      </div>

      <ConfirmDialog
        isOpen={confirming}
        title="Book this shipment?"
        confirmLabel={`Yes, book · ${money(rate.total, rate.currency)}`}
        busy={isLoading}
        onConfirm={() => void confirmBooking()}
        onClose={() => setConfirming(false)}
      >
        <p>
          Are you sure you want to book <strong>{rate.serviceName}</strong> with {rate.providerLabel} for <strong>{money(rate.total, rate.currency)}</strong>? This buys the label and charges your carrier account.
        </p>
        <p className="mt-2 text-xs text-text-muted">
          To {shipTo.name}, {shipTo.address.city} {shipTo.address.province}. Nothing is booked unless you confirm.
        </p>
      </ConfirmDialog>

      <WizardFooter
        start={
          <Button variant="outline" onClick={edit(2)}>
            Back to rates
          </Button>
        }
      >
        {null}
      </WizardFooter>
    </>
  )
}
