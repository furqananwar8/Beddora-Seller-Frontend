'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'
import { CustomsCard } from './CustomsCard'
import { PackageCard } from './PackageCard'
import { ProductsCard } from './ProductsCard'
import type { DraftAction, ShipmentDraft } from './shipmentDraft'
import { fieldCount, type FieldErrors } from './shipmentRules'
import { ShipmentOptionsCards } from './ShipmentOptionsCards'
import { WizardFooter } from './WizardFooter'

interface ShipmentStepProps {
  draft: ShipmentDraft
  dispatch: React.Dispatch<DraftAction>
  errors: FieldErrors
  /** "CA → US" when cross-border, else null. */
  lane: string | null
  /** The footer's Back; the Address step by default. */
  onBack?: () => void
  backLabel?: string
}

/**
 * Step 2: products, the carton, customs lines and options. Required values the product master didn't supply are
 * flagged straight away, and "Get rates" waits until they are filled.
 */
export const ShipmentStep: React.FC<ShipmentStepProps> = ({ draft, dispatch, errors, lane, onBack, backLabel = 'Back' }) => {
  const missing = fieldCount(errors)
  const hint = errors.products ? 'Add a product to get rates' : missing > 0 ? `Fill the ${missing} highlighted ${missing === 1 ? 'field' : 'fields'} to get rates` : undefined
  // Nothing is flagged until there is something to check
  const shown = draft.products.length > 0 ? errors : {}

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <ProductsCard products={draft.products} units={draft.units} errors={shown} dispatch={dispatch} />
        <PackageCard draft={draft} errors={shown} dispatch={dispatch} />
      </div>
      <CustomsCard draft={draft} errors={shown} lane={lane} dispatch={dispatch} />
      <ShipmentOptionsCards options={draft} errors={shown} destination={draft.shipTo.address.country} dispatch={dispatch} />

      <WizardFooter
        start={
          <Button variant="outline" onClick={onBack ?? (() => dispatch({ type: 'goTo', step: 0 }))}>
            {backLabel}
          </Button>
        }
        hint={hint && <span className="text-danger-600">{hint}</span>}
      >
        <Button disabled={Boolean(hint)} onClick={() => dispatch({ type: 'goTo', step: 2 })}>
          Get rates
        </Button>
      </WizardFooter>
    </div>
  )
}
