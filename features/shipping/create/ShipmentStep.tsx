'use client'

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { Button } from '@/design-system/buttons'
import { CustomsCard } from './CustomsCard'
import { PackageCard } from './PackageCard'
import { ProductsCard } from './ProductsCard'
import type { UnitSystem } from './shipmentForm'
import type { ShipmentFormValues } from './shipmentSchema'
import { ShipmentOptionsCards } from './ShipmentOptionsCards'
import { WizardFooter } from './WizardFooter'

interface ShipmentStepProps {
  /** "CA → US" when cross-border, else null. */
  lane: string | null
  /** Fields with an error, in the whole form. */
  errorCount: number
  onUnitsChange: (units: UnitSystem) => void
  /** Why booking can't go on regardless of the fields (e.g. an unmapped SKU); shown in the footer. */
  blockedReason?: React.ReactNode
  onGetRates: () => void
  /** The footer's Back. */
  onBack: () => void
  backLabel?: string
}

/**
 * Step 2: products, the carton, customs lines and options. Required values the product master didn't supply are
 * flagged straight away, and "Get rates" waits until they are filled.
 */
export const ShipmentStep: React.FC<ShipmentStepProps> = ({ lane, errorCount, onUnitsChange, blockedReason, onGetRates, onBack, backLabel = 'Back' }) => {
  const {
    watch,
    formState: { isValid },
  } = useFormContext<ShipmentFormValues>()
  const [products, country] = [watch('products'), watch('shipTo.address.country')]
  const hint =
    products.length === 0
      ? 'Add a product to get rates'
      : blockedReason
        ? blockedReason
        : !isValid
          ? `Fill the ${errorCount || ''} highlighted ${errorCount === 1 ? 'field' : 'fields'} to get rates`.replace('  ', ' ')
          : undefined

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <ProductsCard />
        <PackageCard onUnitsChange={onUnitsChange} />
      </div>
      <CustomsCard lane={lane} />
      <ShipmentOptionsCards destination={country} crossBorder={lane !== null} />

      <WizardFooter
        start={
          <Button variant="outline" onClick={onBack}>
            {backLabel}
          </Button>
        }
        hint={hint && <span className="text-danger-600">{hint}</span>}
      >
        <Button disabled={Boolean(hint)} onClick={onGetRates}>
          Get rates
        </Button>
      </WizardFooter>
    </div>
  )
}
