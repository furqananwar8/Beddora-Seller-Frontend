'use client'

import React from 'react'
import { fieldClass } from '@/components/form-field/FormField'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { cn } from '@/utils/cn'
import { formatVsLowest, TOP_RANKS, type QuoteRow, type RankedRow, type RowErrors } from './priceAnalysisForm'
import { RANK_TONE } from './TopSupplierCards'

import { NumericInput } from '@/components/form-field/NumericInput'
const CELL = 'text-center align-middle'

interface QuotesTableProps {
  rows: RankedRow[]
  /** Errors per supplier id (typed or from the server). */
  errors: Map<number, RowErrors>
  /** Show "Enter a price" etc. only after a save was attempted or the field was left. */
  showErrors: boolean
  onChange: (supplierId: number, patch: Partial<QuoteRow>) => void
  onRemove: (supplierId: number) => void
  readOnly?: boolean
}

/** One row per supplier: point of contact and price typed here, "vs lowest" and rank worked out live. */
export const QuotesTable: React.FC<QuotesTableProps> = ({ rows, errors, showErrors, onChange, onRemove, readOnly }) => (
  <div className="overflow-x-auto rounded-lg border border-border">
    <Table className="min-w-full">
      <TableHeader className="bg-secondary-50">
        <TableRow>
          <TableHead className={cn(CELL, 'w-10')}>#</TableHead>
          <TableHead className="min-w-[180px] text-left">Supplier</TableHead>
          <TableHead className="min-w-[200px] text-left">Supplier POC (point of contact)</TableHead>
          <TableHead className={cn(CELL, 'min-w-[130px]')}>Price / unit</TableHead>
          <TableHead className={CELL}>Vs lowest</TableHead>
          <TableHead className={CELL}>Rank</TableHead>
          {!readOnly && <TableHead className={cn(CELL, 'w-12')} aria-label="Remove" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={readOnly ? 6 : 7}>
              <p className="py-8 text-center text-sm text-text-muted">{readOnly ? 'No supplier quotes yet.' : 'Pick suppliers in “Add suppliers” to add a row for each.'}</p>
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, index) => {
            const rowErrors = errors.get(row.supplier.id) ?? {}
            const priceError = showErrors || rowErrors.supplierId ? rowErrors.unitPrice : undefined
            return (
              <TableRow key={row.supplier.id}>
                <TableCell className={cn(CELL, 'text-text-muted')}>{index + 1}</TableCell>
                <TableCell className="align-middle">
                  <p className="font-semibold text-text-primary">{row.supplier.name}</p>
                  {rowErrors.supplierId && <p className="text-xs text-danger-600">{rowErrors.supplierId}</p>}
                </TableCell>
                <TableCell className="align-middle">
                  <input
                    aria-label={`Point of contact at ${row.supplier.name}`}
                    autoComplete="off"
                    value={row.contactName}
                    placeholder={row.supplier.contactName ?? 'Contact name'}
                    onChange={(event) => onChange(row.supplier.id, { contactName: event.target.value })}
                    className={fieldClass(rowErrors.contactName)}
                    disabled={readOnly}
                  />
                  {rowErrors.contactName && <p className="mt-1 text-xs text-danger-600">{rowErrors.contactName}</p>}
                </TableCell>
                <TableCell className={CELL}>
                  <NumericInput decimal
                    aria-label={`Unit price from ${row.supplier.name}`}

                    autoComplete="off"
                    value={row.unitPrice}
                    placeholder="0.00"
                    onChange={(event) => onChange(row.supplier.id, { unitPrice: event.target.value })}
                    className={cn(fieldClass(priceError), 'text-right tabular-nums')}
                    disabled={readOnly}
                  />
                  {priceError && <p className="mt-1 text-left text-xs text-danger-600">{priceError}</p>}
                </TableCell>
                <TableCell className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{formatVsLowest(row.vsLowestPercent)}</TableCell>
                <TableCell className={CELL}>
                  {row.rank !== null && row.rank <= TOP_RANKS ? (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
                      <span className={cn('h-2.5 w-2.5 rounded-full', RANK_TONE[row.rank].dot)} aria-hidden />
                      Top {row.rank}
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </TableCell>
                {!readOnly && (
                  <TableCell className={CELL}>
                    <button
                      type="button"
                      onClick={() => onRemove(row.supplier.id)}
                      aria-label={`Remove ${row.supplier.name}`}
                      className="rounded p-1 text-text-muted hover:bg-danger-50 hover:text-danger-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </TableCell>
                )}
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  </div>
)
