'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { useFinanceCapabilities } from '../shared/useFinanceCapabilities'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { PartnerListItem } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { formatDay, formatPartnerNo } from '../shared/format'
import { countryName } from './countries'
import { partnerTypeLabel } from './partnerSchema'

const HEAD = 'text-center align-middle'
const CELL = 'text-center align-middle'
const COLUMNS = 8
const BASE = '/dashboard/finance/partner-profile'

interface PartnerTableProps {
  rows: PartnerListItem[]
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  onOpen: (id: number) => void
}

export const PartnerTable: React.FC<PartnerTableProps> = ({ rows, isLoading, isFetching, isError, onOpen }) => {
  const router = useRouter()
  const { canWritePartners } = useFinanceCapabilities()
  return (
  <div className={cn('max-h-[calc(100vh-360px)] overflow-auto', isFetching && 'opacity-70 transition-opacity')}>
    <Table className="min-w-full">
      <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
        <TableRow>
          <TableHead className={HEAD}>ID</TableHead>
          <TableHead className={cn(HEAD, 'min-w-[200px]')}>Name</TableHead>
          <TableHead className={HEAD}>Type</TableHead>
          <TableHead className={HEAD}>Country</TableHead>
          <TableHead className={HEAD}>Currency</TableHead>
          <TableHead className={cn(HEAD, 'min-w-[140px]')}>Payment method</TableHead>
          <TableHead className={HEAD}>Last paid</TableHead>
          <TableHead className={HEAD}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={COLUMNS}>
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            </TableCell>
          </TableRow>
        ) : isError || rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={COLUMNS}>
              <div className={isError ? 'py-12 text-center font-medium text-danger-600' : 'py-12 text-center text-text-muted'}>
                {isError ? 'Could not load partners.' : 'No partners found.'}
              </div>
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow
              key={row.id}
              tabIndex={0}
              role="link"
              onClick={() => onOpen(row.id)}
              onKeyDown={(event) => event.key === 'Enter' && onOpen(row.id)}
              className="cursor-pointer hover:bg-secondary-50"
            >
              <TableCell className={cn(CELL, 'font-mono text-text-muted')}>{formatPartnerNo(row.id)}</TableCell>
              <TableCell className={cn(CELL, 'font-medium text-text-primary')}>{row.name}</TableCell>
              <TableCell className={CELL}>{partnerTypeLabel(row.type)}</TableCell>
              <TableCell className={CELL}>{countryName(row.country) || '—'}</TableCell>
              <TableCell className={CELL}>{row.currency}</TableCell>
              <TableCell className={CELL}>{row.paymentMethod ?? '—'}</TableCell>
              <TableCell className={CELL}>{row.lastPaidAt ? formatDay(row.lastPaidAt) : '—'}</TableCell>
              <TableCell className={CELL}>
                <RowActionsMenu
                  label={row.name}
                  items={[{ key: 'update', label: canWritePartners ? 'Update profile' : 'View profile', onSelect: () => router.push(`${BASE}/${row.id}`) }]}
                />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
  )
}
