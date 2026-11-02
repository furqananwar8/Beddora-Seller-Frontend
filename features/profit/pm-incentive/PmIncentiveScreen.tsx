'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { PmManagersView } from './managers/PmManagersView'
import { PmIncentiveView } from './PmIncentiveView'

type View = 'incentive' | 'managers'

const VIEWS = [
  { value: 'incentive' as const, label: 'PM Incentive' },
  { value: 'managers' as const, label: 'PM Managers' },
]

/** Profit > PM Incentive: switches between the incentive calculation and the product managers' upkeep. */
export const PmIncentiveScreen: React.FC = () => {
  const [view, setView] = useState<View>('incentive')

  return (
    <Container size="full" className="py-4 sm:py-8">
      <SegmentedToggle<View> ariaLabel="PM screen" className="mb-4" options={VIEWS} value={view} onChange={setView} />
      {view === 'incentive' ? <PmIncentiveView /> : <PmManagersView />}
    </Container>
  )
}
