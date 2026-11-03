'use client'

import React, { useState } from 'react'
import { UseFormReturn, useFieldArray, useWatch } from 'react-hook-form'
import { fieldClass } from '@/components/form-field/FormField'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Button } from '@/design-system/buttons'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import type { LengthUnit } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { ColorSelect } from '../shared/ColorSelect'
import { CbmField, LENGTH_UNITS, WeightField } from '../shared/MeasurementFields'
import { PhotoField } from './PhotoField'
import { convertDimensionsText, derivedCbm, MARKETPLACES, newVariation, type ProductFormValues } from './productForm'
import { SkuInput } from './SkuInput'
import { useHsCodeSync } from './useHsCodeSync'
import { useVariantNameSync } from './useVariantNameSync'

interface VariationsSectionProps {
  form: UseFormReturn<ProductFormValues>
  /** Saved master id (for SKU checks and photos). */
  productId?: number
  version?: string
  photos: Map<string, File>
  onPhotoChange: (clientKey: string, file: File | null) => void
  readOnly: boolean
}

const input = (error?: string) => cn(fieldClass(error), 'h-9 py-1 text-sm')

/** A labelled field, so every variation reads on its own. */
const Field: React.FC<{ label: string; error?: string; note?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ label, error, note, className, children }) => (
  <div className={cn('min-w-0', className)}>
    <p className="ds-input-label whitespace-nowrap">{label}</p>
    {children}
    {error ? <p className="mt-1 text-xs text-danger-600">{error}</p> : note && <p className="mt-1 text-xs text-text-muted">{note}</p>}
  </div>
)

const Readout: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <p className="ds-input-label">{label}</p>
    <p className="truncate rounded-lg border border-border bg-secondary-50 px-3 py-2 text-sm text-text-muted">{value}</p>
  </div>
)

export const VariationsSection: React.FC<VariationsSectionProps> = ({ form, productId, version, photos, onPhotoChange, readOnly }) => {
  const {
    control,
    register,
    setValue,
    setError,
    getValues,
    formState: { errors },
  } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'variations', keyName: 'fieldId' })
  const [open, setOpen] = useState<Set<string>>(new Set())
  const masterCategory = useWatch({ control, name: 'category' })
  const variations = useWatch({ control, name: 'variations' }) ?? []
  useVariantNameSync(form)
  useHsCodeSync(form)

  /** Flipping one row's unit re-expresses only that row's two dimension boxes. */
  const switchLength = (index: number, unit: LengthUnit) => {
    const row = getValues(`variations.${index}`)
    if (row.dimensionUnit === unit) return
    setValue(`variations.${index}.dimensionUnit`, unit, { shouldDirty: true })
    setValue(`variations.${index}.dimensions`, convertDimensionsText(row.dimensions, row.dimensionUnit, unit), { shouldDirty: true })
    setValue(`variations.${index}.supplierDimensions`, convertDimensionsText(row.supplierDimensions, row.dimensionUnit, unit), { shouldDirty: true })
  }

  const toggle = (key: string) => setOpen((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const addRow = () => {
    // A new row starts in the units of the row above it, with the master's material and HS code
    const last = getValues('variations').at(-1)
    const row = newVariation(getValues(), last && { weightUnit: last.weightUnit, dimensionUnit: last.dimensionUnit })
    append(row, { shouldFocus: false })
    setOpen((current) => new Set(current).add(row.clientKey))
  }

  const rowErrors = errors.variations

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle>Variations</CardTitle>
          <span className="rounded-full bg-secondary-100 px-2.5 py-0.5 text-xs font-medium text-secondary-700">
            {fields.length} linked to this master
          </span>
        </div>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            + Add variation
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        {fields.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">No variations. This product is ordered on its own SKU.</p>
        ) : (
          <div className="divide-y-8 divide-secondary-100">
            {fields.map((field, index) => {
              const row = variations[index] ?? field
              const key = row.clientKey
              const expanded = open.has(key)
              const err = rowErrors?.[index]
              const hasRowError = Boolean(err && Object.keys(err).length)
              const unit = row.dimensionUnit.toLowerCase()
              const cbmShown = derivedCbm({ dimensions: row.dimensions, cbm: row.cbm, cbmTouched: row.cbmTouched }, row.dimensionUnit)
              return (
                <div key={field.fieldId} className={cn('space-y-4 p-4', hasRowError && 'bg-danger-50/40')}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-text-primary">
                      Variation {index + 1}
                      {row.variantName && <span className="ml-2 font-normal text-text-muted">{row.variantName}</span>}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => toggle(key)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary-600 hover:bg-secondary-100"
                      >
                        <svg className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {expanded ? 'Hide details' : 'More details'}
                      </button>
                      {!readOnly && (
                        <button
                          type="button"
                          aria-label={`Remove variation ${row.sku || index + 1}`}
                          onClick={() => {
                            onPhotoChange(key, null)
                            remove(index)
                          }}
                          className="rounded p-1.5 text-text-muted hover:bg-danger-50 hover:text-danger-600"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.9 12.1A2 2 0 0116.1 21H7.9a2 2 0 01-2-1.9L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Identity */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Variant name" error={err?.variantName?.message} className="sm:col-span-2">
                      <input
                        aria-label="Variant name"
                        autoComplete="off"
                        placeholder="Name-Color-Size"
                        className={input(err?.variantName?.message)}
                        disabled={readOnly}
                        {...register(`variations.${index}.variantName`)}
                      />
                    </Field>
                    <Field label="Marketplace" error={err?.marketplace?.message} note="Each marketplace has its own SKUs">
                      <select aria-label="Marketplace" className={input(err?.marketplace?.message)} disabled={readOnly} {...register(`variations.${index}.marketplace`)}>
                        <option value="">Select marketplace</option>
                        {MARKETPLACES.map((market) => (
                          <option key={market.value} value={market.value}>
                            {market.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="SKU" error={err?.sku?.message}>
                      <SkuInput
                        compact
                        productId={productId}
                        aria-label="SKU"
                        error={err?.sku?.message}
                        className="h-9 py-1 text-sm"
                        disabled={readOnly}
                        onTaken={(sku) => setError(`variations.${index}.sku`, { type: 'server', message: `SKU ${sku} is already used by another product` })}
                        {...register(`variations.${index}.sku`)}
                      />
                    </Field>
                    <Field label="Color *" error={err?.color?.message}>
                      <ColorSelect
                        aria-label="Color"
                        className="h-9 py-1 text-sm"
                        error={err?.color?.message}
                        disabled={readOnly}
                        value={row.color}
                        onChange={(color) => setValue(`variations.${index}.color`, color, { shouldDirty: true, shouldValidate: true })}
                      />
                    </Field>
                    <Field label="Size" error={err?.sizeName?.message}>
                      <input aria-label="Size" placeholder="e.g. Large" className={input(err?.sizeName?.message)} disabled={readOnly} {...register(`variations.${index}.sizeName`)} />
                    </Field>
                    <Field label="Material" error={err?.material?.message}>
                      <input aria-label="Material" className={input(err?.material?.message)} disabled={readOnly} {...register(`variations.${index}.material`)} />
                    </Field>
                    <Field label="Packaging" error={err?.packaging?.message}>
                      <input aria-label="Packaging" className={input(err?.packaging?.message)} disabled={readOnly} {...register(`variations.${index}.packaging`)} />
                    </Field>
                    <Field label="HS code" error={err?.hsCode?.message} note="Starts from the master's; change it for this SKU if it differs">
                      <input
                        aria-label="HS code"
                        autoComplete="off"
                        inputMode="numeric"
                        placeholder="6302.21.00"
                        className={input(err?.hsCode?.message)}
                        disabled={readOnly}
                        {...register(`variations.${index}.hsCode`)}
                      />
                    </Field>
                  </div>

                  {/* Measurements: each variation has its own unit */}
                  <div className="rounded-lg border border-border bg-secondary-50/60 p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Dimensions and weight</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted">Dimensions in</span>
                        <SegmentedToggle<LengthUnit>
                          ariaLabel="Dimension unit"
                          value={row.dimensionUnit}
                          options={LENGTH_UNITS}
                          disabled={readOnly}
                          onChange={(next) => switchLength(index, next)}
                        />
                      </div>
                    </div>
                    <div className="grid items-start gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Individual Product Dimensions" error={err?.dimensions?.message} note={`Add as 10x20x30 (L × W × H) in ${unit}`}>
                        <input
                          aria-label="Individual Product Dimensions"
                          autoComplete="off"
                          placeholder="10x20x30"
                          className={input(err?.dimensions?.message)}
                          disabled={readOnly}
                          {...register(`variations.${index}.dimensions`)}
                        />
                      </Field>
                      {/* Its own KG / LB toggle; flipping it converts the typed weight */}
                      <Field label="Individual Product Weight" error={err?.weight?.message}>
                        <WeightField
                          id={`variation-${index}-weight`}
                          value={row.weight}
                          unit={row.weightUnit}
                          onChange={(value) => setValue(`variations.${index}.weight`, value, { shouldDirty: true, shouldValidate: Boolean(err?.weight) })}
                          onUnitChange={(next, converted) => {
                            setValue(`variations.${index}.weightUnit`, next, { shouldDirty: true })
                            setValue(`variations.${index}.weight`, converted, { shouldDirty: true })
                          }}
                          error={err?.weight?.message}
                          disabled={readOnly}
                        />
                      </Field>
                      <Field label="Supplier Dimensions" error={err?.supplierDimensions?.message} note={`Add as 10x20x30 (L × W × H) in ${unit}`}>
                        <input
                          aria-label="Supplier dimension"
                          autoComplete="off"
                          placeholder="10x20x30"
                          className={input(err?.supplierDimensions?.message)}
                          disabled={readOnly}
                          {...register(`variations.${index}.supplierDimensions`)}
                        />
                      </Field>
                      <Field label="No. of units in master carton" error={err?.unitsPerCarton?.message} note="Whole number, 0 or more">
                        <input
                          aria-label="No. of units in master carton"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          placeholder="e.g. 10"
                          // a minus sign or exponent cannot be typed: the count is never negative
                          onKeyDown={(event) => ['-', '+', 'e', 'E', '.'].includes(event.key) && event.preventDefault()}
                          className={input(err?.unitsPerCarton?.message)}
                          disabled={readOnly}
                          {...register(`variations.${index}.unitsPerCarton`)}
                        />
                      </Field>
                      <Readout label="CBM" value={cbmShown ? `${cbmShown} m³` : '—'} />
                    </div>
                  </div>

                  {expanded && (
                    <VariationDetails
                      form={form}
                      index={index}
                      readOnly={readOnly}
                      categoryName={masterCategory?.name ?? '—'}
                      photo={
                        <PhotoField
                          compact
                          productId={row.id}
                          version={version}
                          hasSavedPhoto={row.hasPhoto}
                          removing={row.removePhoto}
                          onRemoveSaved={(removing) => setValue(`variations.${index}.removePhoto`, removing, { shouldDirty: true })}
                          file={photos.get(key) ?? null}
                          onFileChange={(file) => onPhotoChange(key, file)}
                          disabled={readOnly}
                        />
                      }
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
        <p className="border-t border-border px-4 py-3 text-xs text-text-muted">
          Fields marked * are mandatory. The category always comes from the master; the HS code starts from it and can be changed per SKU. Size, packaging, weight, dimensions and CBM belong to each variation, each with its own units. Each variation is saved as its own product with its own ID and SKU, linked to this master.
        </p>
      </CardContent>
    </Card>
  )
}

interface VariationDetailsProps {
  form: UseFormReturn<ProductFormValues>
  index: number
  readOnly: boolean
  categoryName: string
  photo: React.ReactNode
}

/** More details: category from the master, the CBM override, UPC, ASIN, reorder point, description and photo. */
const VariationDetails: React.FC<VariationDetailsProps> = ({ form, index, readOnly, categoryName, photo }) => {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form
  const err = errors.variations?.[index]
  const [dimensions, cbm, cbmTouched, dimensionUnit] = useWatch({
    control,
    name: [`variations.${index}.dimensions`, `variations.${index}.cbm`, `variations.${index}.cbmTouched`, `variations.${index}.dimensionUnit`],
  })
  const shownCbm = derivedCbm({ dimensions, cbm, cbmTouched }, dimensionUnit)

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-secondary-50/60 p-3 sm:grid-cols-2 lg:grid-cols-4">
      <Readout label="Category" value={`${categoryName} · master`} />
      <div className="min-w-0">
        <p className="ds-input-label">CBM (override)</p>
        <CbmField
          id={`variation-${index}-cbm`}
          value={shownCbm}
          overridden={cbmTouched}
          onOverride={(value) => {
            setValue(`variations.${index}.cbm`, value, { shouldDirty: true })
            setValue(`variations.${index}.cbmTouched`, true)
          }}
          onUseCalculated={() => {
            setValue(`variations.${index}.cbmTouched`, false, { shouldDirty: true })
            setValue(`variations.${index}.cbm`, '')
          }}
          error={err?.cbm?.message}
          disabled={readOnly}
        />
      </div>
      <Field label="UPC (optional)" error={err?.upc?.message}>
        <input id={`variation-${index}-upc`} inputMode="numeric" maxLength={14} className={fieldClass(err?.upc?.message)} disabled={readOnly} {...register(`variations.${index}.upc`)} />
      </Field>
      <Field label="ASIN (optional)" error={err?.asin?.message}>
        <input
          id={`variation-${index}-asin`}
          maxLength={10}
          autoCapitalize="characters"
          className={cn(fieldClass(err?.asin?.message), 'uppercase')}
          disabled={readOnly}
          {...register(`variations.${index}.asin`)}
        />
      </Field>
      <Field label="Reorder (optional)" error={err?.reorderPoint?.message}>
        <input
          id={`variation-${index}-reorder`}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder="Units"
          className={fieldClass(err?.reorderPoint?.message)}
          disabled={readOnly}
          {...register(`variations.${index}.reorderPoint`)}
        />
      </Field>
      <Field label="Description" error={err?.description?.message} className="sm:col-span-2">
        <input aria-label="Description" className={fieldClass(err?.description?.message)} disabled={readOnly} {...register(`variations.${index}.description`)} />
      </Field>
      <div className="min-w-0">
        <p className="ds-input-label">Photo</p>
        {photo}
      </div>
    </div>
  )
}
