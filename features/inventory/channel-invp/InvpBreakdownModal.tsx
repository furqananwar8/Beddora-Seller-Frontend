'use client'

import React from 'react'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { useGetChannelInvpBreakdownQuery, type InvpBreakdownParams } from '@/services/api/channelInvp.api'
import { formatCalendarDay } from '@/utils/format'

const CENTER = 'text-center'

export interface InvpSelection {
  title: string
  params: InvpBreakdownParams
}

/** What one figure is made of: the containers, warehouse movements or channel ledger days behind it. */
export const InvpBreakdownModal: React.FC<{ selection: InvpSelection | null; onClose: () => void }> = ({ selection, onClose }) => {
  const { data, isFetching, isError } = useGetChannelInvpBreakdownQuery(selection?.params as InvpBreakdownParams, { skip: !selection })
  const entries = data?.entries ?? []
  const line = selection?.params.line

  return (
    <Modal isOpen={selection !== null} onClose={onClose} title={selection?.title} size="xl">
      {isFetching ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-danger-600">Could not load the breakdown.</p>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Nothing recorded behind this figure for the period.</p>
      ) : (
        // The header stays at the top of the modal while the entries scroll under it
        <Table className="min-w-full" wrapperClassName="overflow-visible">
          <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>{line === 'container' ? 'Container' : line === 'warehouse' ? 'Movement' : 'Channel SKU'}</TableHead>
              <TableHead>{line === 'channel' ? 'Closing stock' : 'Units'}</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <TableRow key={`${entry.date}-${entry.label}-${index}`}>
                <TableCell className={CENTER}>{formatCalendarDay(entry.date)}</TableCell>
                <TableCell className={CENTER}>{entry.label}</TableCell>
                <TableCell className={`${CENTER} tabular-nums ${entry.quantity < 0 ? 'text-danger-700' : ''}`}>
                  {line === 'warehouse' && entry.quantity > 0 ? '+' : ''}
                  {entry.quantity.toLocaleString()}
                </TableCell>
                <TableCell className={CENTER}>{entry.detail ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Modal>
  )
}
