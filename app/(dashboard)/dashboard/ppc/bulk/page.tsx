'use client'

import React, { useEffect } from 'react'
import { Container, PageHeader } from '@/components/layout'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setPpcBulkFilters } from '@/store/ppcBulk.slice'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import {
  useBulkBidUpdate,
  useBulkStatusChange,
  useApplyRecommendations,
  useFetchBulkHistory,
  useRevertBulkAction,
} from '@/features/ppc/bulk/hooks'
import {
  ApplyRecommendationsCard,
  BulkBidUpdateForm,
  BulkHistoryTable,
  BulkStatusChangeForm,
} from '@/features/ppc/bulk'

export default function PPCBulkPage() {
  const dispatch = useAppDispatch()
  const filters = useAppSelector((state) => state.ppcBulk.filters)
  const { data: accounts } = useGetAccountsQuery()

  useEffect(() => {
    if (!filters.accountId && accounts?.length) {
      dispatch(setPpcBulkFilters({ accountId: accounts[0].id }))
    }
  }, [accounts, dispatch, filters.accountId])

  const accountId = filters.accountId

  const [bulkBidUpdate] = useBulkBidUpdate()
  const [bulkStatusChange] = useBulkStatusChange()
  const [applyRecommendations] = useApplyRecommendations()
  const [revertBulkAction] = useRevertBulkAction()

  const { data: history, isLoading, error } = useFetchBulkHistory(
    { accountId },
    { skip: !accountId }
  )

  return (
    <Container>
      <PageHeader
        title="Bulk PPC Actions"
        description="Apply bid updates and status changes across campaigns, ad groups, and keywords."
      />

      <div className="space-y-6">
        {accountId ? (
          <>
            <BulkBidUpdateForm
              accountId={accountId}
              onPreview={(payload) => bulkBidUpdate({ ...payload, preview: true }).unwrap()}
              onApply={(payload) => bulkBidUpdate({ ...payload, preview: false }).unwrap()}
            />

            <BulkStatusChangeForm
              accountId={accountId}
              onPreview={(payload) => bulkStatusChange({ ...payload, preview: true }).unwrap()}
              onApply={(payload) => bulkStatusChange({ ...payload, preview: false }).unwrap()}
            />

            <ApplyRecommendationsCard
              accountId={accountId}
              onPreview={(payload) => applyRecommendations({ ...payload, preview: true }).unwrap()}
              onApply={(payload) => applyRecommendations({ ...payload, preview: false }).unwrap()}
            />

            <BulkHistoryTable
              items={history?.data}
              isLoading={isLoading}
              error={error}
              onRevert={(historyId) => revertBulkAction({ accountId, historyId })}
            />
          </>
        ) : (
          <div className="text-sm text-text-muted">Select an account to view bulk actions.</div>
        )}
      </div>
    </Container>
  )
}

