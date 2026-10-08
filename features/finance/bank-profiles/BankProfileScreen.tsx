'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Button } from '@/design-system/buttons'
import { useDeleteBankProfileMutation, useGetBankProfilesQuery, type BankProfile } from '@/services/api/finance.api'
import { useDebounce } from '@/utils/debounce'
import { ScreenSearch } from '../shared/ScreenSearch'
import { useFinanceCapabilities } from '../shared/useFinanceCapabilities'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'
import { BankProfileDialog } from './BankProfileDialog'
import { BankProfileTable } from './BankProfileTable'

const PAGE_SIZE = 20

/** Company bank accounts payments are made from, kept apart from partners' payment details. */
export const BankProfileScreen: React.FC = () => {
  const { canWriteBankProfiles } = useFinanceCapabilities()
  const { success, failure } = useFinanceFeedback()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  // `null` closes the dialog, 'new' adds, a profile edits it
  const [editing, setEditing] = useState<BankProfile | 'new' | null>(null)
  const [removing, setRemoving] = useState<BankProfile | null>(null)

  const { data, isLoading, isFetching, isError } = useGetBankProfilesQuery({ search: debouncedSearch, page, limit: PAGE_SIZE })
  const [remove, { isLoading: isRemoving }] = useDeleteBankProfileMutation()

  const confirmRemove = async () => {
    if (!removing) return
    try {
      await remove(removing.id).unwrap()
      success(`${removing.name} removed`)
      setRemoving(null)
    } catch (error) {
      failure(error, 'Could not remove the bank profile')
    }
  }

  return (
    <Container size="full" className="py-4 sm:py-8">
      <ScreenSearch
        placeholder="Search bank name, account title, currency, SWIFT or last 4 digits..."
        value={search}
        onChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-text-primary sm:text-xl">Bank profiles ({data?.totalRecords ?? 0})</h1>
        {canWriteBankProfiles && <Button onClick={() => setEditing('new')}>+ Add bank details</Button>}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <BankProfileTable
          rows={data?.data ?? []}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
          onEdit={canWriteBankProfiles ? setEditing : undefined}
          onRemove={canWriteBankProfiles ? setRemoving : undefined}
        />
        {data && data.totalRecords > 0 && (
          <PaginationFooter
            page={data.page}
            pageSize={data.limit}
            totalItems={data.totalRecords}
            totalPages={data.totalPages}
            onPageChange={setPage}
            itemLabel="bank profiles"
          />
        )}
      </div>

      <BankProfileDialog isOpen={editing !== null} profile={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        isOpen={removing !== null}
        title={`Remove ${removing?.name ?? 'bank profile'}`}
        confirmLabel="Remove"
        tone="danger"
        busy={isRemoving}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      >
        <p>This bank profile will no longer be listed. Its documents are kept. A bank already used on a payment can&apos;t be removed.</p>
      </ConfirmDialog>
    </Container>
  )
}
