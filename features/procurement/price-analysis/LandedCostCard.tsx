'use client'

import React from 'react'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { NumericInput } from '@/components/form-field/NumericInput'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards/Card'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useSavePriceFamilySettingsMutation, type PriceFamilySettings } from '@/services/api/procurement.api'
import { draftFrom, settingsFromDraft, type AssumptionsDraft } from './priceAnalysisForm'

interface LandedCostCardProps {
  /** The master product of the family: its variants share these assumptions. */
  rootId: number
  /** As saved for the family. */
  saved: PriceFamilySettings
  /** As typed: they rank the quotes live, before anything is saved. */
  draft: AssumptionsDraft
  onChange: (draft: AssumptionsDraft) => void
  canWrite: boolean
  currency: string
}

/**
 * Landed cost assumptions of the family (freight per CBM, default duty, clearing/3PL per unit). Typing re-ranks the quotes
 * at once; Save keeps them for the family, so the figures behind every ranking are on record.
 */
export const LandedCostCard: React.FC<LandedCostCardProps> = ({ rootId, saved, draft, onChange, canWrite, currency }) => {
  const { success, failure } = useApiFeedback()
  const [save, { isLoading }] = useSavePriceFamilySettingsMutation()
  const [tried, setTried] = React.useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFrom(saved))
  const dutyTooHigh = Number(draft.defaultDutyPercent) > 100
  const set = (field: keyof AssumptionsDraft) => (event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...draft, [field]: event.target.value })

  const submit = async () => {
    setTried(true)
    if (dutyTooHigh) return
    const { landedEnabled, freightPerCbm, defaultDutyPercent, clearingPerUnit } = settingsFromDraft(draft, null)
    try {
      await save({ rootId, body: { landedEnabled, freightPerCbm, defaultDutyPercent, clearingPerUnit } }).unwrap()
      success('Landed cost assumptions saved for this product family')
      setTried(false)
    } catch (error) {
      failure(error, 'Could not save the assumptions')
    }
  }

  const prefix = currency === 'CAD' ? 'CA$' : '$'
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">Landed cost assumptions</h2>
            <span className="rounded-md bg-secondary-100 px-2 py-0.5 text-[11px] font-medium text-text-secondary">Live Formula</span>
          </div>
          <button type="button" onClick={() => onChange(draftFrom(saved))} disabled={!dirty} className="text-sm font-medium text-primary-600 hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline">
            Reset defaults
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={`Freight Rate (${prefix}/CBM)`} htmlFor="lc-freight">
            <NumericInput decimal id="lc-freight" value={draft.freightPerCbm} placeholder="0.00" onChange={set('freightPerCbm')} className={fieldClass(undefined)} disabled={!canWrite} />
          </FormField>
          <FormField label="Default Duty (%)" htmlFor="lc-duty" error={tried && dutyTooHigh ? 'Duty cannot be above 100%' : undefined}>
            <NumericInput decimal id="lc-duty" value={draft.defaultDutyPercent} placeholder="0" onChange={set('defaultDutyPercent')} className={fieldClass(tried && dutyTooHigh ? 'x' : undefined)} disabled={!canWrite} />
          </FormField>
          <FormField label={`Clearing / 3PL (${prefix}/unit)`} htmlFor="lc-clearing">
            <NumericInput decimal id="lc-clearing" value={draft.clearingPerUnit} placeholder="0.00" onChange={set('clearingPerUnit')} className={fieldClass(undefined)} disabled={!canWrite} />
          </FormField>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
          <p className="font-mono text-[11px] text-text-muted">Landed = FOB + (Unit CBM × Freight/CBM) + (FOB × Duty%) + Clearing</p>
          {canWrite && (
            <Button type="button" size="sm" disabled={!dirty} isLoading={isLoading} onClick={() => void submit()}>
              Save assumptions
            </Button>
          )}
        </div>
        {dirty && <p className="text-xs text-text-muted">Not saved yet: the table ranks with what is typed here, but the family keeps its saved assumptions until you save.</p>}
      </CardContent>
    </Card>
  )
}
