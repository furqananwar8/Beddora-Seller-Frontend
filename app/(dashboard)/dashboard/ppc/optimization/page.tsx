'use client'

import React, { useEffect, useState } from 'react'
import { Container, PageHeader } from '@/components/layout'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setPpcOptimizationFilters } from '@/store/ppcOptimization.slice'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import {
  useFetchOptimizationStatus,
  useFetchOptimizationHistory,
  useRunOptimization,
  useManualBidUpdate,
} from '@/features/ppc/optimization/hooks'
import {
  KeywordHarvesting,
  OptimizationCard,
  OptimizationHistoryTable,
  OptimizationTable,
} from '@/features/ppc/optimization'

export default function PPCOptimizationPage() {
  const dispatch = useAppDispatch()
  const filters = useAppSelector((state) => state.ppcOptimization.filters)
  const { data: accounts } = useGetAccountsQuery()

  const [minBid, setMinBid] = useState(0.1)
  const [maxBid, setMaxBid] = useState(5)
  const [pauseAcosThreshold, setPauseAcosThreshold] = useState(60)

  useEffect(() => {
    if (!filters.accountId && accounts?.length) {
      dispatch(setPpcOptimizationFilters({ accountId: accounts[0].id }))
    }
  }, [accounts, dispatch, filters.accountId])

  const effectiveFilters = {
    ...filters,
    accountId: filters.accountId || '',
  }

  const { data: status, isLoading, error } = useFetchOptimizationStatus(effectiveFilters, {
    skip: !effectiveFilters.accountId,
  })

  const { data: history, isLoading: historyLoading, error: historyError } =
    useFetchOptimizationHistory(
      { accountId: effectiveFilters.accountId },
      { skip: !effectiveFilters.accountId }
    )

  const [runOptimization, { isLoading: isRunning }] = useRunOptimization()
  const [manualBidUpdate] = useManualBidUpdate()

  const handleRunOptimization = async () => {
    if (!effectiveFilters.accountId) return
    await runOptimization({
      ...effectiveFilters,
      minBid,
      maxBid,
      pauseAcosThreshold,
    })
  }

  const handleManualUpdate = async (keywordId: string, bid: number) => {
    if (!effectiveFilters.accountId) return
    await manualBidUpdate({ keywordId, payload: { accountId: effectiveFilters.accountId, currentBid: bid } })
  }

  return (
    <Container>
      <PageHeader
        title="PPC Optimization"
        description="Automate bid adjustments and keyword optimization based on target ACOS."
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input
            label="Marketplace ID"
            value={filters.marketplaceId || ''}
            onChange={(e) => dispatch(setPpcOptimizationFilters({ marketplaceId: e.target.value || undefined }))}
          />
          <Input
            label="Keyword"
            value={filters.keyword || ''}
            onChange={(e) => dispatch(setPpcOptimizationFilters({ keyword: e.target.value || undefined }))}
          />
          <Input
            label="Start Date"
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => dispatch(setPpcOptimizationFilters({ startDate: e.target.value || undefined }))}
          />
          <Input
            label="End Date"
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => dispatch(setPpcOptimizationFilters({ endDate: e.target.value || undefined }))}
          />
          <div className="flex items-end gap-2">
            <Button onClick={handleRunOptimization} disabled={isRunning}>
              {isRunning ? 'Running...' : 'Run Optimization'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Min Bid"
            type="number"
            value={minBid}
            onChange={(e) => setMinBid(Number(e.target.value))}
          />
          <Input
            label="Max Bid"
            type="number"
            value={maxBid}
            onChange={(e) => setMaxBid(Number(e.target.value))}
          />
          <Input
            label="Pause ACOS Threshold"
            type="number"
            value={pauseAcosThreshold}
            onChange={(e) => setPauseAcosThreshold(Number(e.target.value))}
          />
        </div>

        <OptimizationCard summary={status?.summary} />

        <OptimizationTable items={status?.items} isLoading={isLoading} error={error} onManualUpdate={handleManualUpdate} />

        <KeywordHarvesting suggestions={status?.harvesting} />

        <OptimizationHistoryTable
          items={history?.data}
          isLoading={historyLoading}
          error={historyError}
        />
      </div>
    </Container>
  )
}

