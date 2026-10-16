"use client"

import React, { useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Input } from '@/design-system/inputs'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import { CarrierQuote, InboundShipment, WfsCarrierEntry, legId } from './types'
import { DialogFooter, formatShortDate, formatUnits } from './ShipmentParts'

/**
 * WFS carrier per Walmart shipment: the seller's own carrier (both markets), or
 * Walmart's carrier quoted and booked through the API (Walmart.com only; on
 * Walmart.ca it's booked in Seller Center). Tracking comes at "Mark as shipped".
 */

const MAX_CARRIER_LENGTH = 60

interface WfsCarrierModalProps {
  shipment: InboundShipment | null
  /** Walmart's carrier can be booked through the API in this marketplace. */
  walmartCarrier: boolean
  loadQuotes: (shipmentId: string) => Promise<CarrierQuote[]>
  onConfirm: (carriers: WfsCarrierEntry[]) => Promise<void>
  /** Back to the cartons step. */
  onBack: () => void
  onClose: () => void
}

interface LegChoice {
  mode: 'own' | 'walmart'
  carrier: string
  quoteId?: string
  quotes?: CarrierQuote[]
  loading?: boolean
  quoteError?: string
}

export const WfsCarrierModal: React.FC<WfsCarrierModalProps> = ({ shipment, ...rest }) => (
  <Modal isOpen={shipment !== null} onClose={rest.onClose} title="Enter carrier" size="lg">
    {shipment && <CarrierForm key={shipment.id} shipment={shipment} {...rest} />}
  </Modal>
)

const CarrierForm: React.FC<Omit<WfsCarrierModalProps, 'shipment'> & { shipment: InboundShipment }> = ({
  shipment,
  walmartCarrier,
  loadQuotes,
  onConfirm,
  onBack,
  onClose,
}) => {
  const legs = shipment.legs
  const [choices, setChoices] = useState<Record<string, LegChoice>>(() =>
    Object.fromEntries(
      legs.map((l) => [
        legId(l),
        l.quote?.booked
          ? { mode: 'walmart', carrier: '', quoteId: l.quote.quoteId, quotes: [{ quoteId: l.quote.quoteId, carrierName: l.quote.carrierName, amount: l.quote.amount, currency: l.quote.currency }] }
          : { mode: 'own', carrier: l.carrierMode === 'own' ? l.carrier ?? '' : '' },
      ])
    )
  )
  const [touched, setTouched] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (id: string, next: Partial<LegChoice>) => setChoices((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }))

  const errorFor = (c: LegChoice) =>
    c.mode === 'own' ? (c.carrier.trim() ? undefined : 'Enter the carrier name') : c.quoteId ? undefined : 'Get a quote and pick one'
  const invalid = legs.some((l) => !!errorFor(choices[legId(l)]))

  const getQuotes = async (id: string) => {
    update(id, { loading: true, quoteError: undefined })
    try {
      const quotes = await loadQuotes(id)
      update(id, { loading: false, quotes, quoteId: quotes[0]?.quoteId, quoteError: quotes.length ? undefined : 'Walmart returned no rates for this shipment.' })
    } catch (err) {
      update(id, { loading: false, quoteError: (err as Error).message || 'Walmart did not return a quote.' })
    }
  }

  const handleConfirm = async () => {
    setTouched(true)
    if (invalid) return
    setIsSaving(true)
    setError(null)
    try {
      await onConfirm(
        legs.map((l) => {
          const c = choices[legId(l)]
          return c.mode === 'own' ? { shipmentId: legId(l), mode: 'own', carrier: c.carrier.trim() } : { shipmentId: legId(l), mode: 'walmart', quoteId: c.quoteId }
        })
      )
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Could not save the carrier. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const booksWithWalmart = legs.some((l) => choices[legId(l)].mode === 'walmart')

  return (
    <>
      <p className="mb-4 text-sm text-text-muted">
        Choose how each Walmart shipment travels. Tracking numbers are entered when you mark it as shipped.{' '}
        {!walmartCarrier && 'Walmart’s preferred carrier for this marketplace is booked in Seller Center; enter it here as your own carrier.'}
      </p>

      <div className="space-y-4">
        {legs.map((leg) => {
          const id = legId(leg)
          const c = choices[id]
          const legError = touched ? errorFor(c) : undefined
          return (
            <div key={id} className="rounded-lg border border-border p-4">
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                <span className="font-mono font-semibold text-text-secondary">{id}</span>
                <span>
                  {leg.fulfillmentCenter}
                  {leg.fcLocation ? ` · ${leg.fcLocation}` : ''}
                </span>
                <span>
                  {formatUnits(leg.units)} units{leg.boxes ? ` · ${formatUnits(leg.boxes)} cartons` : ''}
                </span>
              </div>

              <div className="space-y-2">
                <ModeOption
                  checked={c.mode === 'own'}
                  disabled={isSaving}
                  onSelect={() => update(id, { mode: 'own' })}
                  title="Your own carrier"
                  description="The carrier you booked; its name and tracking go to Walmart."
                >
                  {c.mode === 'own' && (
                    <Input
                      label="Carrier name"
                      placeholder="e.g. UPS, FedEx, Canada Post"
                      maxLength={MAX_CARRIER_LENGTH}
                      value={c.carrier}
                      disabled={isSaving}
                      onChange={(e) => update(id, { carrier: e.target.value })}
                      error={legError}
                    />
                  )}
                </ModeOption>

                {walmartCarrier && (
                  <ModeOption
                    checked={c.mode === 'walmart'}
                    disabled={isSaving}
                    onSelect={() => update(id, { mode: 'walmart' })}
                    title="Walmart carrier"
                    description="Small parcel at Walmart’s rates, taken from your WFS payouts. Needs carton sizes; a booking can be cancelled within 24 hours."
                  >
                    {c.mode === 'walmart' && (
                      <div className="space-y-2">
                        {c.quotes?.map((q) => (
                          <label
                            key={q.quoteId}
                            className={cn(
                              'flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm',
                              c.quoteId === q.quoteId ? 'border-blue-400 bg-blue-50' : 'border-border'
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <input type="radio" name={`quote-${id}`} checked={c.quoteId === q.quoteId} onChange={() => update(id, { quoteId: q.quoteId })} disabled={isSaving} />
                              <span>
                                {q.carrierName ?? 'Walmart carrier'}
                                {q.estimatedDelivery && <span className="text-xs text-text-muted"> · delivers {formatShortDate(q.estimatedDelivery)}</span>}
                              </span>
                            </span>
                            {q.amount !== undefined && <span className="font-semibold">{formatCurrency(q.amount, q.currency ?? 'USD')}</span>}
                          </label>
                        ))}
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => getQuotes(id)} disabled={isSaving || c.loading}>
                            {c.loading ? (
                              <span className="flex items-center gap-2">
                                <Spinner size="sm" /> Asking Walmart…
                              </span>
                            ) : c.quotes?.length ? (
                              'Get a new quote'
                            ) : (
                              'Get a quote'
                            )}
                          </Button>
                          {(c.quoteError || legError) && <span className="text-xs text-danger-600">{c.quoteError ?? legError}</span>}
                        </div>
                      </div>
                    )}
                  </ModeOption>
                )}
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
              <Spinner size="sm" className="text-white" /> {booksWithWalmart ? 'Booking with Walmart…' : 'Saving…'}
            </span>
          ) : booksWithWalmart ? (
            'Accept & book'
          ) : (
            'Confirm carrier'
          )}
        </Button>
      </DialogFooter>
    </>
  )
}

const ModeOption: React.FC<{
  checked: boolean
  disabled?: boolean
  onSelect: () => void
  title: string
  description: string
  children?: React.ReactNode
}> = ({ checked, disabled, onSelect, title, description, children }) => (
  <div className={cn('rounded-md border px-3 py-2.5', checked ? 'border-blue-300 bg-blue-50/40' : 'border-border')}>
    <label className="flex cursor-pointer items-start gap-2">
      <input type="radio" checked={checked} onChange={onSelect} disabled={disabled} className="mt-1" />
      <span>
        <span className="block text-sm font-medium text-text-primary">{title}</span>
        <span className="block text-xs text-text-muted">{description}</span>
      </span>
    </label>
    {children && <div className="mt-2 pl-6">{children}</div>}
  </div>
)
