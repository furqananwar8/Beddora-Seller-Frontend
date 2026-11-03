'use client'

import React from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import { fieldClass } from '@/components/form-field/FormField'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { cn } from '@/utils/cn'
import { MARKETPLACES, type ProductFormValues } from './productForm'
import { SkuInput } from './SkuInput'

interface MarketplaceSkusProps {
  form: UseFormReturn<ProductFormValues>
  /** Index of the variation in the form. */
  index: number
  /** Saved family, whose own SKUs do not count as taken. */
  productId?: number
  readOnly: boolean
}

const OPTIONS = MARKETPLACES.map((market) => ({ id: market.value, name: market.label }))
const CODES: string[] = MARKETPLACES.map((market) => market.value)

type Entry = ProductFormValues['variations'][number]['skus'][number]

/**
 * The marketplaces a variation is sold in, and the SKUs it has in each: any number of marketplaces, any number of SKUs
 * in each. Picking a marketplace starts it with one blank SKU (a variation can be sold somewhere before its SKU is
 * known); unpicking it drops its SKUs. The first SKU is the one the rest of the app reads for the variation.
 */
export const MarketplaceSkus: React.FC<MarketplaceSkusProps> = ({ form, index, productId, readOnly }) => {
  const {
    control,
    setValue,
    setError,
    formState: { errors },
  } = form
  const skus: Entry[] = useWatch({ control, name: `variations.${index}.skus` }) ?? []
  const entryErrors = errors.variations?.[index]?.skus
  const selected = CODES.filter((code) => skus.some((entry) => entry.marketplace === code))
  // A SKU saved before marketplaces existed has none; the user assigns one
  const unassigned = skus.map((entry, at) => ({ entry, at })).filter(({ entry }) => !CODES.includes(entry.marketplace))

  const write = (next: Entry[]) => setValue(`variations.${index}.skus`, next, { shouldDirty: true, shouldValidate: true })
  const pick = (codes: string[]) => {
    const kept = skus.filter((entry) => codes.includes(entry.marketplace) || !CODES.includes(entry.marketplace))
    const added = CODES.filter((code) => codes.includes(code) && !selected.includes(code)).map((code) => ({ marketplace: code as Entry['marketplace'], sku: '' }))
    write([...kept, ...added])
  }
  const change = (at: number, patch: Partial<Entry>) => write(skus.map((entry, i) => (i === at ? { ...entry, ...patch } : entry)))
  const add = (code: string) => write([...skus, { marketplace: code as Entry['marketplace'], sku: '' }])
  const remove = (at: number) => write(skus.filter((_, i) => i !== at))

  return (
    <div className="grid min-w-0 gap-3 sm:col-span-2 lg:col-span-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
      <div className="min-w-0">
        <p className="ds-input-label">Marketplaces</p>
        <MultiSelectInput
          title="Marketplace"
          options={OPTIONS}
          value={selected}
          onChange={pick}
          placeholder="Select marketplaces"
          renderValue={(chosen) => (chosen.length ? chosen.map((market) => market.name).join(', ') : <span className="text-text-muted">Select marketplaces</span>)}
        />
        <p className="mt-1 text-xs text-text-muted">Pick every marketplace this variation is sold in; each has its own SKUs</p>
      </div>

      <div className="min-w-0 space-y-2">
        <p className="ds-input-label">SKUs</p>
        {selected.length === 0 && unassigned.length === 0 && <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-text-muted">Pick a marketplace to add its SKUs</p>}

        {unassigned.map(({ entry, at }) => (
          <div key={`unassigned-${at}`} className="flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50/60 p-2">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs text-warning-700">This SKU has no marketplace yet. Choose one.</p>
              <select
                aria-label="Marketplace of this SKU"
                className={cn(fieldClass(entryErrors?.[at]?.marketplace?.message), 'h-9 py-1 text-sm')}
                disabled={readOnly}
                value=""
                onChange={(event) => change(at, { marketplace: event.target.value as Entry['marketplace'] })}
              >
                <option value="">Select marketplace</option>
                {MARKETPLACES.map((market) => (
                  <option key={market.value} value={market.value}>
                    {market.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 font-mono text-xs">{entry.sku}</p>
            </div>
          </div>
        ))}

        {selected.map((code) => {
          const label = MARKETPLACES.find((market) => market.value === code)?.label ?? code
          const group = skus.map((entry, at) => ({ entry, at })).filter(({ entry }) => entry.marketplace === code)
          return (
            <div key={code} className="rounded-lg border border-border bg-surface p-2">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
                {!readOnly && (
                  <button type="button" onClick={() => add(code)} className="text-xs font-medium text-primary-600 hover:underline">
                    + Add SKU
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {group.map(({ entry, at }) => {
                  const error = entryErrors?.[at]?.sku?.message
                  return (
                    <div key={`${code}-${at}`}>
                      <div className="flex items-center gap-2">
                        <SkuInput
                          compact
                          aria-label={`${label} SKU`}
                          placeholder={`${label} SKU`}
                          productId={productId}
                          error={error}
                          className="h-9 py-1 text-sm"
                          disabled={readOnly}
                          value={entry.sku}
                          onChange={(event) => change(at, { sku: event.target.value })}
                          onTaken={(sku) => setError(`variations.${index}.skus.${at}.sku`, { type: 'server', message: `SKU ${sku} is already used by another product` })}
                        />
                        {!readOnly && group.length > 1 && (
                          <button type="button" aria-label={`Remove ${label} SKU`} onClick={() => remove(at)} className="shrink-0 rounded p-1.5 text-text-muted hover:bg-danger-50 hover:text-danger-600">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
