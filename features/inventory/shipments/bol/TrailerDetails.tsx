'use client'

import React, { useState } from 'react'
import { cn } from '@/utils/cn'
import { Input, Textarea } from '@/design-system/inputs'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import type { BolLeg, BolOverrides, BolView } from '@/services/api/shipmentBols.api'
import type { RowErrors, TrailerDraft, TrailerTextField } from './bolModel'

interface TrailerDetailsProps {
  view: BolView
  leg: BolLeg
  draft: TrailerDraft
  errors: RowErrors
  disabled: boolean
  onText: (field: TrailerTextField, value: string) => void
  onOverrides: (overrides: BolOverrides) => void
  /** Opens the carrier-step editor of this FC (changes every trailer of it). */
  onEditCarrierStep: () => void
}

/**
 * The rest of a trailer's BOL: times, truck, trailer, seal and PRO #, contact, commodity and notes. Values the shipment
 * already knows are shown read-only with ✎ Edit: carrier-step values can be changed for the whole FC (carrier step) or
 * for this trailer only; other shipment values become an override on this trailer, resettable to the shipment's.
 */
export const TrailerDetails: React.FC<TrailerDetailsProps> = ({ view, leg, draft, errors, disabled, onText, onOverrides, onEditCarrierStep }) => {
  const step = leg.carrierStep
  const o = draft.overrides
  const set = (key: keyof BolOverrides, value: string | undefined) => {
    const next = { ...o }
    if (value === undefined || value.trim() === '') delete next[key]
    else next[key] = value
    onOverrides(next)
  }
  const field = (name: TrailerTextField, label: string, extra?: { placeholder?: string; error?: string; maxLength?: number }) => (
    <Input
      label={label}
      value={draft[name]}
      disabled={disabled}
      placeholder={extra?.placeholder}
      maxLength={extra?.maxLength ?? 60}
      error={extra?.error}
      onChange={(e) => onText(name, e.target.value)}
    />
  )

  const carrierNote = step.editable ? '✎ Edit: whole FC or this trailer only' : '✎ Edit changes this trailer only'
  const carrierValue = (label: string, key: 'carrier' | 'pickupDate' | 'deliveryDate' | 'appointmentNo', value: string | null, extra?: { type?: 'date'; missing?: string }) => (
    <ShipmentValue
      label={label}
      type={extra?.type}
      value={value}
      missing={extra?.missing}
      override={o[key]}
      carrierStep={step.editable}
      disabled={disabled}
      onEditAll={onEditCarrierStep}
      onOverride={(v) => set(key, v)}
    />
  )

  return (
    <div className="grid gap-4 rounded-xl bg-secondary-50 p-4 lg:grid-cols-2">
      <Card title="Carrier and schedule" note={carrierNote} className="lg:col-span-2" cols="sm:grid-cols-2 xl:grid-cols-4">
        {carrierValue('Carrier / driver', 'carrier', step.carrier)}
        {carrierValue('Delivery appointment #', 'appointmentNo', step.appointmentNo, { missing: 'Not set' })}
        {field('pickupNo', 'Pick-up #', { placeholder: "Carrier's booking number" })}
        {field('contact', 'Shipper contact', { maxLength: 120 })}
        {carrierValue('Pick-up date', 'pickupDate', step.pickupDate, { type: 'date' })}
        {field('pickupTime', 'Pick-up time', { placeholder: '13:00 EDT', error: errors.pickupTime, maxLength: 20 })}
        {carrierValue('Delivery date', 'deliveryDate', step.deliveryDate, { type: 'date' })}
        {field('deliveryTime', 'Delivery time', { placeholder: '15:00 EDT', error: errors.deliveryTime, maxLength: 20 })}
      </Card>

      <Card title="Truck" cols="sm:grid-cols-2">
        {field('truckNo', 'Truck #')}
        {field('trailerNo', 'Trailer #')}
        {field('sealNo', 'Seal #')}
        {field('proNo', 'PRO # (freight bill)')}
      </Card>

      <Card title="Load" note="✎ Edit changes this trailer only" cols="sm:grid-cols-2">
        <ShipmentValue label={view.labels.shipmentId} value={leg.shipmentConfirmationId} override={o.shipmentConfirmationId} disabled={disabled} onOverride={(v) => set('shipmentConfirmationId', v)} />
        <ShipmentValue label={view.labels.referenceId} value={leg.amazonReferenceId} missing={`Not received from ${view.labels.partner} yet`} override={o.amazonReferenceId} disabled={disabled} onOverride={(v) => set('amazonReferenceId', v)} />
        <div className="sm:col-span-2">{field('commodity', 'Commodity', { maxLength: 200 })}</div>
      </Card>

      <Card title="Shipper (from)" note="✎ Edit changes this trailer only">
        <ShipmentValue label="Name" value={view.shipper.name} override={o.shipperName} disabled={disabled} onOverride={(v) => set('shipperName', v)} />
        <ShipmentValue label="Address" value={view.shipper.address} multiline override={o.shipperAddress} disabled={disabled} onOverride={(v) => set('shipperAddress', v)} />
      </Card>

      <Card title="Receiver (to)" note="✎ Edit changes this trailer only">
        <ShipmentValue label="Name" value={leg.receiverName} override={o.receiverName} disabled={disabled} onOverride={(v) => set('receiverName', v)} />
        <ShipmentValue
          label="Address"
          value={leg.receiverAddress || null}
          missing={`Not received from ${view.labels.partner} yet`}
          multiline
          override={o.receiverAddress}
          disabled={disabled}
          onOverride={(v) => set('receiverAddress', v)}
        />
      </Card>

      <Card title="Notes" note="Printed on the BOL" className="lg:col-span-2">
        <Textarea
          aria-label="Notes"
          rows={2}
          value={draft.notes}
          disabled={disabled}
          maxLength={500}
          placeholder="Handling instructions, dock hours…"
          onChange={(e) => onText('notes', e.target.value)}
        />
      </Card>
    </div>
  )
}

/** A titled white card of fields; `cols` sets its grid columns. */
const Card: React.FC<{ title: string; note?: string; className?: string; cols?: string; children: React.ReactNode }> = ({ title, note, className, cols, children }) => (
  <section className={cn('rounded-lg border border-border bg-surface shadow-sm', className)}>
    <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-2.5">
      <h5 className="text-xs font-semibold uppercase tracking-wide text-text-primary">{title}</h5>
      {note && <span className="text-xs text-text-muted">{note}</span>}
    </header>
    <div className={cn('grid gap-3 p-4', cols)}>{children}</div>
  </section>
)

interface ShipmentValueProps {
  label: string
  /** The shipment's value; null when it doesn't have one. */
  value: string | null
  missing?: string
  override?: string
  type?: 'text' | 'date'
  multiline?: boolean
  disabled: boolean
  /** Set for carrier-step values: Edit then offers changing the carrier step (all trailers) or this trailer only. */
  carrierStep?: boolean
  onEditAll?: () => void
  onOverride: (value: string | undefined) => void
}

/** A value the shipment provides, read-only until ✎ Edit; an edited one is marked and can go back to the shipment's. */
const ShipmentValue: React.FC<ShipmentValueProps> = ({ label, value, missing = 'Not set', override, type = 'text', multiline, disabled, carrierStep, onEditAll, onOverride }) => {
  const [editing, setEditing] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [text, setText] = useState(override ?? value ?? '')
  const shown = override ?? value

  const startOverride = () => {
    setChoosing(false)
    setText(override ?? value ?? '')
    setEditing(true)
  }
  const commit = () => {
    setEditing(false)
    onOverride(text.trim() && text.trim() !== (value ?? '') ? text.trim() : undefined)
  }

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="ds-input-label mb-0">{label}</span>
        {!disabled && !editing && (
          <button
            type="button"
            className="text-xs font-semibold text-primary-600 hover:underline"
            onClick={() => (carrierStep && onEditAll ? setChoosing((c) => !c) : startOverride())}
          >
            ✎ Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-1">
          {multiline ? (
            <Textarea aria-label={label} rows={3} value={text} autoFocus onChange={(e) => setText(e.target.value)} />
          ) : type === 'date' ? (
            <SingleDatePicker value={text} onChange={setText} />
          ) : (
            <Input aria-label={label} value={text} autoFocus onChange={(e) => setText(e.target.value)} />
          )}
          <div className="flex gap-3 text-xs">
            <button type="button" className="font-semibold text-primary-600 hover:underline" onClick={commit}>
              Use for this trailer
            </button>
            <button type="button" className="text-text-muted hover:underline" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'min-h-[38px] whitespace-pre-line rounded-md border border-border bg-secondary-50 px-3 py-2 text-sm',
            shown ? 'text-text-primary' : 'text-warning-700'
          )}
        >
          {shown || missing}
        </div>
      )}
      {choosing && (
        <div className="mt-1 flex flex-col gap-1 rounded-md border border-border bg-surface p-2 text-xs">
          <button
            type="button"
            className="text-left font-semibold text-primary-600 hover:underline"
            onClick={() => {
              setChoosing(false)
              onEditAll?.()
            }}
          >
            Change in the carrier step (all trailers of this FC)
          </button>
          <button type="button" className="text-left text-text-secondary hover:underline" onClick={startOverride}>
            Only for this trailer
          </button>
        </div>
      )}
      {override !== undefined && !editing && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="rounded bg-warning-50 px-1.5 py-0.5 font-medium text-warning-700">Edited</span>
          <button type="button" className="text-text-muted hover:underline" disabled={disabled} onClick={() => onOverride(undefined)}>
            Reset to shipment value
          </button>
        </div>
      )}
    </div>
  )
}
