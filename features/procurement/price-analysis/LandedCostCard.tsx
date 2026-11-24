'use client'

import React, { useEffect, useState } from 'react'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { NumericInput } from '@/components/form-field/NumericInput'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Button } from '@/design-system/buttons'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useSavePriceFamilySettingsMutation, type PriceFamilySettings } from '@/services/api/procurement.api'

/** What the form starts with when nobody set landed cost yet (a starting point to edit, not a rule). */
const STARTING_POINT = { freightPerCbm: '', defaultDutyPercent: '', clearingPerUnit: '' }

interface Draft {
  landedEnabled: boolean
  freightPerCbm: string
  defaultDutyPercent: string
  clearingPerUnit: string
}

const draftFrom = (settings: PriceFamilySettings): Draft => ({
  landedEnabled: settings.landedEnabled,
  freightPerCbm: settings.freightPerCbm === null ? STARTING_POINT.freightPerCbm : String(settings.freightPerCbm),
  defaultDutyPercent: settings.defaultDutyPercent === null ? STARTING_POINT.defaultDutyPercent : String(settings.defaultDutyPercent),
  clearingPerUnit: settings.clearingPerUnit === null ? STARTING_POINT.clearingPerUnit : String(settings.clearingPerUnit),
})

const amount = (value: string): number | null => (value.trim() && Number.isFinite(Number(value)) ? Number(value) : null)

interface LandedCostCardProps {
  /** The master product of the family (or the product itself when it has no variations): the inputs are shared by its variants. */
  rootId: number
  settings: PriceFamilySettings
  canWrite: boolean
  currency: string
}

/**
 * Landed cost, shared by every variant of the family. Off, quotes are ranked by FOB price; on, each quote gets a unit CBM
 * and duty and is ranked on what it costs once it is here.
 */
export const LandedCostCard: React.FC<LandedCostCardProps> = ({ rootId, settings, canWrite, currency }) => {
  const { success, failure } = useApiFeedback()
  const [save, { isLoading }] = useSavePriceFamilySettingsMutation()
  const [draft, setDraft] = useState<Draft>(() => draftFrom(settings))
  const [tried, setTried] = useState(false)

  // A save (here, or on another variant of the family) refreshes the card
  useEffect(() => {
    setDraft(draftFrom(settings))
    setTried(false)
  }, [settings])

  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFrom(settings))
  const freightMissing = draft.landedEnabled && amount(draft.freightPerCbm) === null
  const dutyTooHigh = amount(draft.defaultDutyPercent) !== null && Number(draft.defaultDutyPercent) > 100

  const submit = async () => {
    setTried(true)
    if (freightMissing || dutyTooHigh) return
    try {
      await save({
        rootId,
        body: { landedEnabled: draft.landedEnabled, freightPerCbm: amount(draft.freightPerCbm), defaultDutyPercent: amount(draft.defaultDutyPercent), clearingPerUnit: amount(draft.clearingPerUnit) },
      }).unwrap()
      success(draft.landedEnabled ? 'Landed cost saved · quotes can be ranked by landed cost' : 'Landed cost is off · quotes are ranked by FOB price')
    } catch (error) {
      failure(error, 'Could not save landed cost')
    }
  }

  const disabled = !canWrite
  const inputs = draft.landedEnabled
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>
            Landed cost <span className="ml-1 text-sm font-normal text-text-muted">shared by every variant of this product</span>
          </CardTitle>
          <SegmentedToggle<'off' | 'on'>
            ariaLabel="Landed cost"
            value={draft.landedEnabled ? 'on' : 'off'}
            onChange={(value) => setDraft((current) => ({ ...current, landedEnabled: value === 'on' }))}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'on', label: 'On' },
            ]}
            disabled={disabled}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!inputs ? (
          <p className="text-sm text-text-muted">Quotes are ranked by the FOB price. Turn landed cost on to add freight, duty and clearing and rank by what a unit costs once it is here.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label={`Freight rate (${currency} per CBM)`} htmlFor="lc-freight" error={tried && freightMissing ? 'Enter the freight rate' : undefined}>
                <NumericInput decimal id="lc-freight" value={draft.freightPerCbm} placeholder="0.00" onChange={(event) => setDraft((current) => ({ ...current, freightPerCbm: event.target.value }))} className={fieldClass(tried && freightMissing ? 'x' : undefined)} disabled={disabled} />
              </FormField>
              <FormField label="Default duty (%)" htmlFor="lc-duty" hint="Each quote can override it" error={tried && dutyTooHigh ? 'Duty cannot be above 100%' : undefined}>
                <NumericInput decimal id="lc-duty" value={draft.defaultDutyPercent} placeholder="0" onChange={(event) => setDraft((current) => ({ ...current, defaultDutyPercent: event.target.value }))} className={fieldClass(tried && dutyTooHigh ? 'x' : undefined)} disabled={disabled} />
              </FormField>
              <FormField label={`Clearing / 3PL (${currency} per unit)`} htmlFor="lc-clearing">
                <NumericInput decimal id="lc-clearing" value={draft.clearingPerUnit} placeholder="0.00" onChange={(event) => setDraft((current) => ({ ...current, clearingPerUnit: event.target.value }))} className={fieldClass(undefined)} disabled={disabled} />
              </FormField>
            </div>
            <p className="rounded-lg bg-secondary-50 px-3 py-2 font-mono text-xs text-text-secondary">Landed = FOB + (unit CBM × freight per CBM) + (FOB × duty %) + clearing</p>
          </>
        )}
        {canWrite && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!dirty || isLoading} onClick={() => setDraft(draftFrom(settings))}>
              Discard
            </Button>
            <Button type="button" size="sm" disabled={!dirty} isLoading={isLoading} onClick={() => void submit()}>
              Save landed cost
            </Button>
          </div>
        )}
        {dirty && <p className="text-xs text-text-muted">Not saved yet: the quotes below keep using the saved values.</p>}
      </CardContent>
    </Card>
  )
}
