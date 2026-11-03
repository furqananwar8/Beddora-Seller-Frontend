'use client'

import React from 'react'
import { RowActionsMenu, type RowActionItem } from '@/components/row-actions-menu/RowActionsMenu'
import { TreeTable, type TreeColumn } from '@/components/tree-table/TreeTable'
import type { PoProduct, PoProductListItem } from '@/services/api/procurement.api'
import { ProductPhoto } from '../shared/ProductPhoto'
import { ProductTagBadge } from '../shared/ProductTagBadge'
import { formatCbm, formatDimensions, formatSize, formatWeight } from '../shared/units'
import { marketplaceLabel } from './productForm'

type Row = PoProductListItem | PoProduct

const isListItem = (row: Row): row is PoProductListItem => 'variations' in row

/** "Canada, USA": every marketplace the variation is sold in. */
const marketplacesOf = (row: PoProduct): string => {
  const codes = row.skus?.length ? [...new Set(row.skus.map((entry) => entry.marketplace))] : row.marketplace ? [row.marketplace] : []
  return codes.length ? codes.map((code) => marketplaceLabel(code)).join(', ') : '—'
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** A parent has no weight or size of its own: it shows how many of its listed variations have one, like "2 colors". */
const variationsWith = (row: Row, has: (variation: PoProduct) => boolean): number => (isListItem(row) ? row.variations.filter(has).length : 0)
const summary = (count: number, word: string) => (count > 0 ? <span className="text-xs text-text-muted">{plural(count, word)}</span> : '—')

export interface ProductRowActions {
  canWrite: boolean
  onEdit: (row: Row) => void
  onAddVariation: (row: PoProductListItem) => void
  onDuplicate: (row: PoProductListItem) => void
  onArchive: (row: Row) => void
  onDelete: (row: Row) => void
}

function actionsFor(row: Row, actions: ProductRowActions): RowActionItem[] {
  const edit: RowActionItem = { key: 'edit', label: actions.canWrite ? 'Edit product' : 'View product', onSelect: () => actions.onEdit(row) }
  if (!actions.canWrite) return [edit]
  // A variation row, whether nested under its parent or listed on its own by the Variations filter
  if (row.tag === 'VARIATION' || !isListItem(row)) {
    return [
      edit,
      { key: 'archive', label: 'Archive variation', tone: 'danger', onSelect: () => actions.onArchive(row) },
      { key: 'delete', label: 'Delete variation', tone: 'danger', onSelect: () => actions.onDelete(row) },
    ]
  }
  return [
    edit,
    { key: 'variation', label: 'Add variation', onSelect: () => actions.onAddVariation(row) },
    { key: 'duplicate', label: 'Duplicate', onSelect: () => actions.onDuplicate(row) },
    { key: 'archive', label: 'Archive', tone: 'danger', onSelect: () => actions.onArchive(row) },
    { key: 'delete', label: 'Delete', tone: 'danger', onSelect: () => actions.onDelete(row) },
  ]
}

function columns(actions: ProductRowActions): TreeColumn<Row>[] {
  return [
    {
      key: 'product',
      header: 'Product',
      className: 'min-w-[220px]',
      render: (row, { isChild }) => (
        <div className={`flex items-center gap-3 text-left ${isChild ? 'pl-4' : ''}`}>
          <ProductPhoto productId={row.id} hasPhoto={row.hasPhoto} version={row.updatedAt} alt={row.name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary">{row.name}</p>
            <p className="font-mono text-xs text-text-muted">{row.pid}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'variant',
      header: 'Variant name',
      className: 'min-w-[200px]',
      render: (row) =>
        row.variantName ? (
          <span className="font-medium text-text-primary">{row.variantName}</span>
        ) : isListItem(row) && row.variationCount > 0 ? (
          <span className="text-xs text-text-muted">{plural(row.variationCount, 'variant')}</span>
        ) : (
          '—'
        ),
    },
    {
      key: 'marketplace',
      header: 'Marketplace',
      className: 'whitespace-nowrap',
      render: (row) => (row.tag === 'VARIATION' ? marketplacesOf(row) : '—'),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (row) => (
        <span className="whitespace-nowrap font-mono text-xs">
          {row.sku ?? '—'}
          {(row.skus?.filter((entry) => entry.sku).length ?? 0) > 1 && <span className="ml-1 font-sans text-text-muted">+{row.skus.filter((entry) => entry.sku).length - 1}</span>}
        </span>
      ),
    },
    { key: 'tag', header: 'Tag', render: (row) => <ProductTagBadge tag={row.tag} /> },
    {
      key: 'color',
      header: 'Color',
      render: (row) =>
        row.color ?? (isListItem(row) && row.colorCount > 0 ? <span className="text-xs text-text-muted">{plural(row.colorCount, 'color')}</span> : '—'),
    },
    { key: 'material', header: 'Material', className: 'min-w-[120px]', render: (row) => row.material ?? '—' },
    { key: 'size', header: 'Size', render: (row) => row.sizeName ?? '—' },
    { key: 'packaging', header: 'Packaging', className: 'min-w-[120px]', render: (row) => row.packaging ?? '—' },
    { key: 'category', header: 'Category', render: (row) => row.category?.name ?? '—' },
    { key: 'weight', header: 'Weight', className: 'whitespace-nowrap', render: (row) =>
        row.tag === 'PARENT' ? summary(variationsWith(row, (variation) => variation.weightKg !== null), 'weight') : <span className="whitespace-nowrap">{formatWeight(row.weightKg, row.weightUnit)}</span>,
    },
    {
      key: 'dims',
      header: 'L × W × H',
      // Without a width the header wraps one letter per line when the table is squeezed
      className: 'min-w-[130px] whitespace-nowrap',
      render: (row) =>
        row.tag === 'PARENT' ? (
          summary(variationsWith(row, (variation) => variation.lengthCm !== null && variation.widthCm !== null && variation.heightCm !== null), 'dimension')
        ) : (
          <span className="whitespace-nowrap">{formatDimensions(row.lengthCm, row.widthCm, row.heightCm, row.dimensionUnit)}</span>
        ),
    },
    {
      key: 'cbm',
      header: 'CBM',
      className: 'whitespace-nowrap',
      render: (row) => (row.tag === 'PARENT' ? summary(variationsWith(row, (variation) => variation.cbm !== null), 'CBM') : <span className="font-mono text-xs">{formatCbm(row.cbm)}</span>),
    },
    { key: 'actions', header: 'Actions', render: (row) => <RowActionsMenu label={row.ref} items={actionsFor(row, actions)} /> },
  ]
}

interface ProductsTableProps extends ProductRowActions {
  rows: PoProductListItem[]
  isLoading: boolean
  isError: boolean
  /** A search or filter is applied: parents with matching variations open on their own. */
  filtered: boolean
}

export const ProductsTable: React.FC<ProductsTableProps> = ({ rows, isLoading, isError, filtered, ...actions }) => (
  <TreeTable<Row>
    // The list sits in its own scrolling box; the table's own scroller would hold the sticky header in place
    wrapperClassName="overflow-visible"
    columns={columns(actions)}
    rows={rows}
    getKey={(row) => row.id}
    getChildren={(row) => (isListItem(row) ? row.variations : [])}
    autoExpand={() => filtered}
    isLoading={isLoading}
    isError={isError}
    emptyText={filtered ? 'No products match these filters.' : 'No products yet. Create the first one.'}
    errorText="Could not load products."
  />
)
