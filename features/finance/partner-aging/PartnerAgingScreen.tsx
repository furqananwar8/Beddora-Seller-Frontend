'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { useGetPartnerAgingQuery } from '@/services/api/finance.api'
import { formatDay } from '../shared/format'
import { AgingEntriesModal, type AgingSelection } from './AgingEntriesModal'
import { AgingTable } from './AgingTable'

/** Open payments per partner by how close they are to their due date, and how far past it. */
export const PartnerAgingScreen: React.FC = () => {
  const { data, isLoading, isError } = useGetPartnerAgingQuery()
  const [selection, setSelection] = useState<AgingSelection | null>(null)

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 px-1 sm:mb-6">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Partner Aging Report</h1>
        <p className="mt-1 text-sm text-text-muted">
          Requests raised and not yet paid, by due date{data ? ` as of ${formatDay(data.asOf)}` : ''}. Click an amount to see the payments in it.
        </p>
      </div>
      <AgingTable report={data} isLoading={isLoading} isError={isError} onOpen={setSelection} />
      <AgingEntriesModal selection={selection} onClose={() => setSelection(null)} />
    </Container>
  )
}
