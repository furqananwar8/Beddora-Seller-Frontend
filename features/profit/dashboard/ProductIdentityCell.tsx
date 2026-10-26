'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { MarketplaceFlag } from '@/components/marketplace-flag/MarketPlaceFlag'
import { Tooltip } from '@/design-system/tooltips'
import { formatCurrency } from '@/utils/format'
import { amazonProductUrl } from '@/utils/marketplaces'

/** The product fields the cell shows (a ProductProfitBreakdown row has them all). */
export interface ProductIdentity {
  sku: string
  asin?: string | null
  productTitle?: string | null
  imageUrl?: string | null
  marketplace?: string
  salesRevenue?: number
  unitsSold?: number
  cogsRate?: number | null
  promoRebates?: number
  /** Set on a group row other than a parent (brand, supplier, ...): the group's name. */
  groupLabel?: string
  children?: unknown[]
}

interface ProductIdentityCellProps {
  product: ProductIdentity
  isChild?: boolean
  isExpanded?: boolean
  /** Expands the row's children; without it no expand arrow is shown. */
  onToggle?: () => void
  /** Shows the product description (its title) on hover of the product instead of in the row. */
  titleInTooltip?: boolean
  /** Shows price per unit, COGS and promo under the identity. Defaults to on; never on a parent row (it has children). */
  showUnitStats?: boolean
  /** The row's FBA stock; when given with `onFbaStockClick`, an "FBA stock: N" link opens its details. */
  fbaStock?: { fbaStock: number; regions: number } | null
  onFbaStockClick?: (anchorRect: DOMRect) => void
}

/** Opens the product's Amazon page in a new tab; plain text when there is no ASIN to link to. */
const AmazonLink: React.FC<{ asin?: string | null; marketplace?: string; children: React.ReactNode }> = ({ asin, marketplace, children }) =>
  asin ? (
    <a
      href={amazonProductUrl(asin, marketplace)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="hover:text-primary-600 hover:underline"
    >
      {children}
    </a>
  ) : (
    <>{children}</>
  )

const PREVIEW_SIZE = 220
const PREVIEW_GAP = 8

/** The full-size version of an Amazon image: drops a size suffix such as `._SL75_` (other URLs stay as they are). */
const fullSizeImageUrl = (url: string) => url.replace(/\._[A-Z]{2}[^./]*_(?=\.[a-z]+$)/i, '')

/**
 * A product thumbnail that shows a larger preview to its top-right on hover. The preview is fixed to the viewport
 * (in a portal), so a scrolling table does not clip it; it flips to the left when there is no room on the right.
 */
const ProductThumbnail: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)

  const left = anchor
    ? anchor.right + PREVIEW_GAP + PREVIEW_SIZE <= window.innerWidth - 8
      ? anchor.right + PREVIEW_GAP
      : Math.max(8, anchor.left - PREVIEW_GAP - PREVIEW_SIZE)
    : 0
  const top = anchor ? Math.min(Math.max(8, anchor.top - PREVIEW_SIZE + anchor.height), window.innerHeight - PREVIEW_SIZE - 8) : 0

  return (
    <>
      {/* Multiply blend: the photo's white background takes the row's colour (e.g. a status tint) instead of a white box */}
      <img
        src={src}
        alt={alt}
        onMouseEnter={(event) => setAnchor(event.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setAnchor(null)}
        className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
      />
      {anchor &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[60] rounded-lg border border-border bg-white p-2 shadow-xl"
            style={{ left, top, width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          >
            <img
              src={fullSizeImageUrl(src)}
              alt=""
              onError={(event) => {
                if (event.currentTarget.src !== src) event.currentTarget.src = src
              }}
              className="h-full w-full object-contain"
            />
          </div>,
          document.body
        )}
    </>
  )
}

/**
 * The products table's product cell: image, marketplace and SKU, ASIN, title, then price per unit, COGS and promo.
 * Shared by the built-in Amazon columns and by pages that build their own columns on SellerboardProductsTable.
 */
export function ProductIdentityCell({ product, isChild = false, isExpanded = false, onToggle, titleInTooltip = false, showUnitStats = true, fbaStock, onFbaStockClick }: ProductIdentityCellProps) {
  // A parent's per-unit figures blend its children (often 0 when costs sit on the children): each child shows its own
  const isParentRow = !isChild && (product.children?.length ?? 0) > 0
  const unitStatsShown = showUnitStats && !isParentRow
  const details = product.groupLabel ? (
    <div className="min-w-0 flex-1 max-w-[220px]">
      <div className="font-medium text-text-primary text-sm mb-1 truncate">{product.groupLabel}</div>
      <div className="text-xs text-text-muted">{product.children?.length ?? 0} products</div>
    </div>
  ) : (
    <div className="min-w-0 flex-1 max-w-[220px]">
      <div className="text-xs text-text-muted mb-1 truncate flex items-center gap-1.5">
        <MarketplaceFlag marketplace={product.marketplace} />
        <AmazonLink asin={product.asin} marketplace={product.marketplace}>{product.sku}</AmazonLink>
      </div>

      {product.asin && (
        <div className="text-xs text-text-muted mb-1 truncate">
          <span className="font-semibold text-text-primary">ASIN</span>{' '}
          <AmazonLink asin={product.asin} marketplace={product.marketplace}>{product.asin}</AmazonLink>
        </div>
      )}

      {!titleInTooltip && (
        <div className="font-medium text-text-primary text-sm mb-1.5 line-clamp-2 break-words">
          {product.productTitle || '-'}
        </div>
      )}

      {unitStatsShown && (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <div>
          <span className="text-text-primary font-medium">
            {formatCurrency(
              (product.salesRevenue || 0) /
                Math.max(product.unitsSold || 1, 1)
            )}
          </span>
        </div>

        <div>
          <span className="text-text-muted">COGS </span>
          <span className="text-text-primary font-medium">
            {formatCurrency(product.cogsRate || 0)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-text-primary font-medium">
            {formatCurrency(
              Math.abs(product.promoRebates || 0)
            )}
          </span>
          <svg
            className="w-3 h-3 text-danger-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 01-1-1 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      )}

      {fbaStock && onFbaStockClick && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onFbaStockClick(event.currentTarget.getBoundingClientRect())
          }}
          className="mt-1 text-xs text-primary-600 hover:text-primary-700 hover:underline"
          aria-label={`FBA stock details for ${product.sku}`}
        >
          FBA stock{fbaStock.regions > 1 ? ` (${fbaStock.regions} regions)` : ''}: {fbaStock.fbaStock.toLocaleString('en-CA')}
        </button>
      )}
    </div>
  )

  const identity = (
    <div className="flex items-start gap-3 min-w-[280px]">
      <div
        className={`w-12 h-12 rounded flex items-center justify-center flex-shrink-0 overflow-hidden ${
          product.imageUrl ? '' : 'bg-surface-secondary'
        }`}
      >
        {product.imageUrl ? (
          <ProductThumbnail src={product.imageUrl} alt={product.productTitle || product.sku || 'Product'} />
        ) : (
          <svg
            className="w-6 h-6 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>

      {details}
    </div>
  )

  return (
    <div
      className={`
        flex items-start
        ${isChild ? 'pl-7' : ''}
      `}
    >
      {/* A child row expands too when it has rows of its own (e.g. a product's listings under a parent) */}
      {onToggle && (!isChild || !!product.children?.length) && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 mr-1 w-5 h-5 flex items-center justify-center flex-shrink-0 rounded text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {titleInTooltip && product.productTitle && !product.groupLabel ? (
        <Tooltip content={product.productTitle} side="bottom" multiline>
          {identity}
        </Tooltip>
      ) : (
        identity
      )}
    </div>
  )
}
