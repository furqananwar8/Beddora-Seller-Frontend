'use client'

import React from 'react'
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

/**
 * The products table's product cell: image, marketplace and SKU, ASIN, title, then price per unit, COGS and promo.
 * Shared by the built-in Amazon columns and by pages that build their own columns on SellerboardProductsTable.
 */
export function ProductIdentityCell({ product, isChild = false, isExpanded = false, onToggle, titleInTooltip = false }: ProductIdentityCellProps) {
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
          // Multiply blend: the photo's white background takes the row's colour (e.g. a status tint) instead of a white box
          <img
            src={product.imageUrl}
            alt={product.productTitle || product.sku || 'Product'}
            className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
          />
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
      {!isChild && onToggle && (
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
