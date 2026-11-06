'use client'

import React from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Button } from '@/design-system/buttons'
import { CustomsCard } from './CustomsCard'
import { PackageCard } from './PackageCard'
import type { UnitSystem } from './shipmentForm'
import { ShipmentOptionsCards } from './ShipmentOptionsCards'
import { WizardFooter } from './WizardFooter'
import type { ShipmentFormValues } from './shipmentSchema'

interface ShipmentStepProps {
  /** The products card: the catalogue picker (Create shipment) or the order's lines (Book order). */
  products: React.ReactNode
  /** "CA → US" when cross-border, else null. */
  lane: string | null
  onUnitsChange: (units: UnitSystem) => void
  /** "Get rates" is always available; the screen's gate validates and toasts what is wrong. */
  onGetRates: () => void
  /** The footer's Back. */
  onBack: () => void
  backLabel?: string
}

/**
 * Step 2: products, the carton, customs lines and options. Invalid fields are marked on the form and "Get rates"
 * explains what is missing in a toast when pressed, instead of staying disabled.
 */
export const ShipmentStep: React.FC<ShipmentStepProps> = ({ products, lane, onUnitsChange, onGetRates, onBack, backLabel = 'Back' }) => {
  const { control } = useFormContext<ShipmentFormValues>()
  const country = useWatch({ control, name: 'shipTo.address.country' })

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        {products}
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
      >
        <Button onClick={onGetRates}>Get rates</Button>
      </WizardFooter>
    </div>
  )
}
