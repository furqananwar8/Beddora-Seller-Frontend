'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import {
  useCreateBankProfileMutation,
  useDeleteBankProfileMutation,
  useGetBankProfilesQuery,
  type BankProfile,
} from '@/services/api/finance.api'
import { useDebounce } from '@/utils/debounce'
import { cn } from '@/utils/cn'
import { PaymentMethodCard } from '../partners/PaymentMethodCard'
import { PaymentMethodDialog } from '../partners/PaymentMethodDialog'
import { buildBankProfileFormData } from '../partners/partnerPayload'
import type { BankProfileFormValues } from '../partners/partnerSchema'
import { ScreenSearch } from '../shared/ScreenSearch'
import { useFinanceCapabilities } from '../shared/useFinanceCapabilities'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'

const PAGE_SIZE = 12

type TypeFilter = 'ALL' | BankProfile['type']

/** Company bank accounts and card links, kept apart from partners' payment details. */
export const BankProfileScreen: React.FC = () => {
  const { canWriteBankProfiles } = useFinanceCapabilities()
  const { success, failure } = useFinanceFeedback()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [type, setType] = useState<TypeFilter>('ALL')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<BankProfile | null>(null)

  const { data, isLoading, isFetching, isError } = useGetBankProfilesQuery({
    search: debouncedSearch,
    type: type === 'ALL' ? undefined : type,
    page,
    limit: PAGE_SIZE,
  })
  const [create] = useCreateBankProfileMutation()
  const [remove, { isLoading: isRemoving }] = useDeleteBankProfileMutation()
  const rows = data?.data ?? []

  const add = async (values: BankProfileFormValues, files: File[]) => {
    try {
      await create(buildBankProfileFormData(values, files)).unwrap()
      success('Bank profile added')
      setAdding(false)
    } catch (error) {
      failure(error, 'Could not add the bank profile')
    }
  }

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
        placeholder="Search name, account holder, SWIFT or last 4 digits..."
        value={search}
        onChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-text-primary sm:text-xl">Bank profiles ({data?.totalRecords ?? 0})</h1>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedToggle<TypeFilter>
            ariaLabel="Filter by type"
            value={type}
            onChange={(value) => {
              setType(value)
              setPage(1)
            }}
            options={[
              { value: 'ALL', label: 'All' },
              { value: 'BANK', label: 'Bank' },
              { value: 'CARD_LINK', label: 'Credit card' },
            ]}
          />
          {canWriteBankProfiles && <Button onClick={() => setAdding(true)}>+ Add bank details</Button>}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : isError || rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
          <div className="font-medium text-text-primary">{isError ? 'Could not load bank profiles' : 'No bank profile yet'}</div>
          {!isError && <div className="mt-1 text-sm text-text-muted">Add bank account details or a credit-card payment link.</div>}
        </div>
      ) : (
        <div className={cn('grid gap-3 md:grid-cols-2 xl:grid-cols-3', isFetching && 'opacity-70 transition-opacity')}>
          {rows.map((profile) => (
            <PaymentMethodCard
              key={profile.id}
              method={profile}
              removing={isRemoving && removing?.id === profile.id}
              onRemove={canWriteBankProfiles ? () => setRemoving(profile) : undefined}
            />
          ))}
        </div>
      )}

      {data && data.totalRecords > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <PaginationFooter
            page={data.page}
            pageSize={data.limit}
            totalItems={data.totalRecords}
            totalPages={data.totalPages}
            onPageChange={setPage}
            itemLabel="bank profiles"
          />
        </div>
      )}

      <PaymentMethodDialog isOpen={adding} subtitle="Bank profile · New" named onClose={() => setAdding(false)} onSubmit={add} />

      <ConfirmDialog
        isOpen={removing !== null}
        title={`Remove ${removing?.name ?? 'bank profile'}`}
        confirmLabel="Remove"
        tone="danger"
        busy={isRemoving}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      >
        <p>This bank profile will no longer be listed. Its documents are kept.</p>
      </ConfirmDialog>
    </Container>
  )
}
