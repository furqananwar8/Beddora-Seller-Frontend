'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/utils/cn'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { useReportExport } from '@/hooks/useReportExport'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useGetShipmentBolsQuery, useSaveShipmentBolTrailersMutation, type BolLeg, type BolStatus, type BolView } from '@/services/api/shipmentBols.api'
import { formatUnits } from '../ShipmentParts'
import type { InboundShipment } from '../types'
import { CarrierDetailsModal } from './CarrierDetailsModal'
import { TrailerDetails } from './TrailerDetails'
import { checkLeg, fromBol, isDirty, nextTrailer, plannedTrailers, toInput, type TrailerCountField, type TrailerDraft, type TrailerTextField } from './bolModel'

interface BolModalProps {
  shipment: InboundShipment | null
  onClose: () => void
}

/**
 * Bills of lading of one shipment: one tab per FC (Amazon shipment), each with its trailers as rows. A row is one
 * BOL; their boxes and units together never exceed the FC's. PDFs are built by the export worker and download by
 * themselves when ready, like every export.
 */
export const BolModal: React.FC<BolModalProps> = ({ shipment, onClose }) => (
  <Modal isOpen={shipment !== null} onClose={onClose} title={shipment ? `Bills of lading · ${shipment.reference}` : 'Bills of lading'} size="xl">
    {shipment && <BolBody key={shipment.id} shipmentId={shipment.id} onClose={onClose} />}
  </Modal>
)

const errorText = (err: unknown, fallback: string) => {
  const data = (err as { data?: { message?: string; error?: string } })?.data
  return data?.message ?? data?.error ?? fallback
}

const BolBody: React.FC<{ shipmentId: string; onClose: () => void }> = ({ shipmentId, onClose }) => {
  const { data: view, isLoading, error, refetch } = useGetShipmentBolsQuery(shipmentId, { refetchOnMountOrArgChange: true })
  const [active, setActive] = useState<string | null>(null)
  /** Unsaved rows per FC, kept while switching tabs. */
  const [drafts, setDrafts] = useState<Record<string, TrailerDraft[]>>({})
  const [carrierLeg, setCarrierLeg] = useState<BolLeg | null>(null)
  const { start, isExporting } = useReportExport('shipment-bol', { noun: 'bill of lading' })

  // A finished export marked its BOLs as built: show them as ready
  const wasExporting = useRef(false)
  useEffect(() => {
    if (wasExporting.current && !isExporting) void refetch()
    wasExporting.current = isExporting
  }, [isExporting, refetch])

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>
  if (error || !view) {
    return (
      <div role="alert" className="rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
        {errorText(error, 'Could not load the bills of lading')}
      </div>
    )
  }

  const leg = view.legs.find((l) => l.amazonShipmentId === active) ?? view.legs[0]
  const rows = drafts[leg.amazonShipmentId] ?? leg.bols.map(fromBol)
  const setRows = (next: TrailerDraft[] | ((rows: TrailerDraft[]) => TrailerDraft[])) =>
    setDrafts((all) => ({ ...all, [leg.amazonShipmentId]: typeof next === 'function' ? next(all[leg.amazonShipmentId] ?? leg.bols.map(fromBol)) : next }))
  const download = (bolIds: number[]) => start('pdf', { shipmentId: view.shipmentId, bolIds })
  const allBolIds = view.legs.flatMap((l) => l.bols.filter((b) => b.status !== 'over').map((b) => b.id))

  return (
    <div className="space-y-4">
      {view.legs.length > 1 && (
        <div role="tablist" className="flex flex-wrap gap-1 border-b border-border">
          {view.legs.map((l) => {
            const on = l.amazonShipmentId === leg.amazonShipmentId
            const unsaved = drafts[l.amazonShipmentId] && isDirty(l, drafts[l.amazonShipmentId])
            return (
              <button
                key={l.amazonShipmentId}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => setActive(l.amazonShipmentId)}
                className={cn('-mb-px border-b-2 px-3 py-2 text-sm', on ? 'border-secondary-900 font-semibold text-text-primary' : 'border-transparent text-text-muted hover:text-text-primary')}
              >
                {l.fulfillmentCenter}
                {l.shipmentConfirmationId ? ` · ${l.shipmentConfirmationId}` : ''}
                <span className="ml-1.5 rounded-full bg-secondary-100 px-1.5 text-xs">{l.bols.length}</span>
                {unsaved && <span className="ml-1 text-warning-700" title="Unsaved changes">●</span>}
              </button>
            )
          })}
        </div>
      )}

      <LegPanel
        key={leg.amazonShipmentId}
        view={view}
        leg={leg}
        shipmentId={shipmentId}
        rows={rows}
        setRows={setRows}
        onSaved={() => setDrafts((all) => {
          const { [leg.amazonShipmentId]: _saved, ...rest } = all
          return rest
        })}
        onDownload={download}
        isExporting={isExporting}
        onEditCarrierStep={() => setCarrierLeg(leg)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <span className="text-xs text-text-muted">PDFs are prepared in the background and download by themselves when ready.</span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" disabled={isExporting || allBolIds.length === 0} onClick={() => download(allBolIds)}>
            {isExporting ? 'Preparing…' : `Download all (${allBolIds.length})`}
          </Button>
        </div>
      </div>

      <CarrierDetailsModal shipmentId={shipmentId} leg={carrierLeg} onClose={() => setCarrierLeg(null)} />
    </div>
  )
}

interface LegPanelProps {
  view: BolView
  leg: BolLeg
  shipmentId: string
  rows: TrailerDraft[]
  setRows: (next: TrailerDraft[] | ((rows: TrailerDraft[]) => TrailerDraft[])) => void
  onSaved: () => void
  onDownload: (bolIds: number[]) => void
  isExporting: boolean
  onEditCarrierStep: () => void
}

const STATUS_META: Record<BolStatus | 'unsaved', { label: string; className: string }> = {
  unsaved: { label: 'Unsaved', className: 'bg-warning-50 text-warning-700' },
  draft: { label: 'Draft', className: 'bg-secondary-100 text-text-secondary' },
  ready: { label: 'Ready', className: 'bg-success-50 text-success-700' },
  over: { label: 'Over', className: 'bg-danger-50 text-danger-700' },
}

const LegPanel: React.FC<LegPanelProps> = ({ view, leg, shipmentId, rows, setRows, onSaved, onDownload, isExporting, onEditCarrierStep }) => {
  const { success, failure } = useApiFeedback()
  const [save, { isLoading: isSaving }] = useSaveShipmentBolTrailersMutation()
  const [open, setOpen] = useState<string | null>(null)
  const [planCount, setPlanCount] = useState('1')
  const [confirmPartial, setConfirmPartial] = useState(false)
  const check = useMemo(() => checkLeg(leg, rows), [leg, rows])
  const dirty = isDirty(leg, rows)
  const disabled = !view.editable || isSaving
  const step = leg.carrierStep
  const carrierMissing = !step.done && rows.some((r) => !r.overrides.carrier)

  const update = useCallback(
    (key: string, patch: Partial<TrailerDraft>) => setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r))),
    [setRows]
  )

  const persist = async (): Promise<number[] | null> => {
    if (check.blocker) {
      failure(null, check.blocker)
      return null
    }
    try {
      const saved = await save({ shipmentId, amazonShipmentId: leg.amazonShipmentId, trailers: rows.map(toInput) }).unwrap()
      onSaved()
      return saved.legs.find((l) => l.amazonShipmentId === leg.amazonShipmentId)?.bols.map((b) => b.id) ?? []
    } catch (err) {
      failure(err, errorText(err, 'Could not save the trailers'))
      return null
    }
  }

  const saveDrafts = async () => {
    if ((await persist()) !== null) success(`${leg.fulfillmentCenter}: trailers saved`)
  }

  const generate = async (force = false) => {
    if (carrierMissing) return failure(null, `Add the carrier for ${leg.fulfillmentCenter} first (carrier step, or ✎ Edit on each trailer)`)
    if (!force && (check.unassigned.boxes > 0 || check.unassigned.units > 0)) return setConfirmPartial(true)
    setConfirmPartial(false)
    const ids = dirty ? await persist() : leg.bols.map((b) => b.id)
    if (ids && ids.length) onDownload(ids)
  }

  const bar = (used: number, total: number) => (total > 0 ? Math.min(100, (used / total) * 100) : 0)

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface p-3 text-sm md:grid-cols-4">
        <Meta label="Destination" value={`${leg.fulfillmentCenter}${leg.fcLocation ? ` · ${leg.fcLocation}` : ''}`} />
        <Meta label="Carrier" value={step.carrier ?? 'Not entered yet'} warn={!step.done} />
        <Meta label="Pick-up → delivery" value={step.pickupDate ? `${step.pickupDate} → ${step.deliveryDate ?? '?'}` : 'Not entered yet'} warn={!step.pickupDate} />
        <Meta label="Mode" value={view.shippingMode === 'LTL_FTL' ? 'LTL / FTL' : view.shippingMode === 'SPD' ? 'Small parcel' : '-'} />
      </dl>

      {!step.done ? (
        <Note tone="err">
          The carrier step hasn&apos;t been done for {leg.fulfillmentCenter}, so there is no carrier or dates to print. Enter the carrier from the shipment row first
          (or ✎ Edit the carrier on each trailer).
        </Note>
      ) : !step.appointmentNo ? (
        <Note tone="warn">
          The carrier step has no appointment ID for {leg.fulfillmentCenter}; it prints as the delivery appointment #.{' '}
          {view.editable && (
            <button type="button" className="font-semibold underline" onClick={onEditCarrierStep}>
              Edit carrier details
            </button>
          )}
        </Note>
      ) : null}

      <div className="space-y-1.5 rounded-lg border border-border p-3 text-sm">
        <Allocation label="Boxes" used={check.used.boxes} total={leg.totals.boxes} width={bar(check.used.boxes, leg.totals.boxes)} over={check.overBoxes > 0} />
        <Allocation label="Units" used={check.used.units} total={leg.totals.units} width={bar(check.used.units, leg.totals.units)} over={check.overUnits > 0} />
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="w-14 font-semibold text-text-secondary">Pallets</span>
          {check.used.pallets} on {rows.length} trailer{rows.length === 1 ? '' : 's'} · about {leg.suggested.pallets} suggested from the box sizes
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-5 text-center">
          <p className="mb-3 text-sm text-text-secondary">
            How many trailers are taking {leg.fulfillmentCenter}&apos;s {formatUnits(leg.totals.boxes)} boxes? Boxes, units, pallets and weight are split for you.
          </p>
          <div className="flex items-center justify-center gap-2">
            <input
              aria-label="Number of trailers"
              type="number"
              min={1}
              max={20}
              value={planCount}
              disabled={disabled}
              onChange={(e) => setPlanCount(e.target.value)}
              className="w-20 rounded-md border border-border px-3 py-2 text-sm"
            />
            <Button disabled={disabled || !(Number(planCount) >= 1)} onClick={() => setRows(plannedTrailers(view, leg, Math.min(20, Math.floor(Number(planCount)))))}>
              Create trailers
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 text-left text-xs text-text-secondary">
              <tr>
                <th className="px-3 py-2">Trailer</th>
                <th className="px-2 py-2">Pallets</th>
                <th className="px-2 py-2">Boxes</th>
                <th className="px-2 py-2">Units</th>
                <th className="px-2 py-2">Weight (lb)</th>
                <th className="px-2 py-2">Pick-up #</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const errors = check.rows[index]
                const saved = row.id !== undefined ? leg.bols.find((b) => b.id === row.id) : undefined
                const changed = !saved || JSON.stringify(toInput(row)) !== JSON.stringify(toInput(fromBol(saved)))
                const status = changed ? 'unsaved' : row.status ?? 'draft'
                const isOpen = open === row.key
                const numberCell = (field: TrailerCountField, step?: string) => (
                  <input
                    aria-label={`Trailer ${index + 1} ${field}`}
                    type="number"
                    min={0}
                    step={step ?? '1'}
                    value={row[field]}
                    disabled={disabled}
                    onChange={(e) => update(row.key, { [field]: e.target.value })}
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-sm', field === 'weight' ? 'w-24' : 'w-[72px]',
                      errors[field] || ((field === 'boxes' && check.overBoxes > 0) || (field === 'units' && check.overUnits > 0)) ? 'border-danger-500 bg-danger-50' : 'border-border'
                    )}
                    title={errors[field]}
                  />
                )
                return (
                  <React.Fragment key={row.key}>
                    <tr className="border-t border-border align-middle">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-text-primary">Trailer {index + 1}</div>
                        <div className="font-mono text-xs text-text-muted">{row.reference ?? 'New'}</div>
                      </td>
                      <td className="px-2 py-2">{numberCell('pallets')}</td>
                      <td className="px-2 py-2">{numberCell('boxes')}</td>
                      <td className="px-2 py-2">{numberCell('units')}</td>
                      <td className="px-2 py-2">{numberCell('weight', '0.01')}</td>
                      <td className="px-2 py-2">
                        <input
                          aria-label={`Trailer ${index + 1} pick-up number`}
                          value={row.pickupNo}
                          disabled={disabled}
                          maxLength={60}
                          placeholder="Carrier's #"
                          onChange={(e) => update(row.key, { pickupNo: e.target.value })}
                          className="w-28 rounded-md border border-border px-2 py-1.5 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <span className={cn('rounded px-2 py-0.5 text-xs font-medium', STATUS_META[status].className)}>{STATUS_META[status].label}</span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right">
                        <button type="button" className="mr-3 text-xs font-semibold text-primary-600 hover:underline" onClick={() => setOpen(isOpen ? null : row.key)}>
                          {isOpen ? 'Hide details' : 'Details'}
                        </button>
                        {saved && !changed && status !== 'over' && (
                          <button type="button" className="mr-3 text-xs font-semibold text-primary-600 hover:underline disabled:opacity-40" disabled={isExporting || carrierMissing} onClick={() => onDownload([saved.id])}>
                            Download
                          </button>
                        )}
                        {view.editable && (
                          <button
                            type="button"
                            aria-label={`Remove trailer ${index + 1}`}
                            className="text-sm text-text-muted hover:text-danger-600"
                            disabled={disabled}
                            onClick={() => {
                              if (row.status === 'ready' && !window.confirm(`${row.reference} was already generated. Remove this trailer? It is deleted when you save.`)) return
                              setRows((current) => current.filter((r) => r.key !== row.key))
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} className="px-3 pb-3">
                          <TrailerDetails
                            view={view}
                            leg={leg}
                            draft={row}
                            errors={errors}
                            disabled={disabled}
                            onText={(field: TrailerTextField, value) => update(row.key, { [field]: value })}
                            onOverrides={(overrides) => update(row.key, { overrides })}
                            onEditCarrierStep={onEditCarrierStep}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
              <tr className={cn('border-t border-border bg-secondary-50 font-semibold', (check.overBoxes > 0 || check.overUnits > 0) && 'bg-danger-50 text-danger-700')}>
                <td className="px-3 py-2">Total</td>
                <td className="px-2 py-2">{check.used.pallets}</td>
                <td className="px-2 py-2">
                  {formatUnits(check.used.boxes)} / {formatUnits(leg.totals.boxes)}
                </td>
                <td className="px-2 py-2">
                  {formatUnits(check.used.units)} / {formatUnits(leg.totals.units)}
                </td>
                <td className="px-2 py-2">{check.used.weight.toLocaleString('en-CA', { maximumFractionDigits: 2 })}</td>
                <td colSpan={3} className="px-2 py-2 text-xs font-normal">
                  {check.overBoxes > 0 || check.overUnits > 0
                    ? [check.overBoxes > 0 && `${check.overBoxes} boxes`, check.overUnits > 0 && `${check.overUnits} units`].filter(Boolean).join(' and ') + ' over the shipment'
                    : check.unassigned.boxes || check.unassigned.units
                    ? `${formatUnits(check.unassigned.boxes)} boxes and ${formatUnits(check.unassigned.units)} units not on a trailer yet`
                    : 'All boxes and units are on a trailer'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {view.editable && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={disabled} onClick={() => setRows((current) => [...current, nextTrailer(view, leg, current)])}>
            + Add trailer
          </Button>
          <span className="text-xs text-text-muted">
            {check.unassigned.boxes > 0 ? `The new trailer takes the ${formatUnits(check.unassigned.boxes)} boxes still unassigned.` : 'Everything is assigned: a new trailer starts at 0; lower the others to give it boxes.'}
          </span>
        </div>
      )}

      {check.blocker && rows.length > 0 && <Note tone="err">{check.blocker}. Saving is blocked until it fits.</Note>}

      {confirmPartial && (
        <Note tone="warn">
          {formatUnits(check.unassigned.boxes)} boxes and {formatUnits(check.unassigned.units)} units of {leg.fulfillmentCenter} aren&apos;t on any trailer yet.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void generate(true)}>
            Generate anyway
          </button>{' '}
          ·{' '}
          <button type="button" className="underline" onClick={() => setConfirmPartial(false)}>
            Keep editing
          </button>
        </Note>
      )}

      {view.editable && (rows.length > 0 || leg.bols.length > 0) && (
        <div className="flex flex-wrap justify-end gap-2">
          {dirty && (
            <Button variant="outline" disabled={disabled} onClick={() => setRows(leg.bols.map(fromBol))}>
              Discard changes
            </Button>
          )}
          <Button variant="outline" disabled={disabled || !dirty || !!check.blocker} onClick={() => void saveDrafts()}>
            {isSaving ? 'Saving…' : 'Save drafts'}
          </Button>
          <Button disabled={disabled || isExporting || rows.length === 0 || !!check.blocker} onClick={() => void generate()}>
            {isExporting ? 'Preparing…' : dirty ? 'Save & generate' : `Generate ${rows.length === 1 ? 'BOL' : `all ${rows.length} BOLs`}`}
          </Button>
        </div>
      )}
    </div>
  )
}

const Meta: React.FC<{ label: string; value: string; warn?: boolean }> = ({ label, value, warn }) => (
  <div className="min-w-0">
    <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
    <dd className={cn('truncate font-semibold', warn ? 'text-warning-700' : 'text-text-primary')} title={value}>
      {value}
    </dd>
  </div>
)

const Allocation: React.FC<{ label: string; used: number; total: number; width: number; over: boolean }> = ({ label, used, total, width, over }) => (
  <div className="flex items-center gap-3">
    <span className="w-14 text-xs font-semibold text-text-secondary">{label}</span>
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary-100">
      <div className={cn('h-full rounded-full', over ? 'bg-danger-500' : 'bg-secondary-800')} style={{ width: `${width}%` }} />
    </div>
    <span className={cn('w-40 text-right text-xs', over ? 'font-semibold text-danger-700' : 'text-text-muted')}>
      {formatUnits(used)} of {formatUnits(total)} assigned
    </span>
  </div>
)

const Note: React.FC<{ tone: 'warn' | 'err'; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    role={tone === 'err' ? 'alert' : 'status'}
    className={cn('rounded-md border px-3 py-2 text-sm', tone === 'err' ? 'border-danger-200 bg-danger-50 text-danger-700' : 'border-warning-200 bg-warning-50 text-warning-800')}
  >
    {children}
  </div>
)
