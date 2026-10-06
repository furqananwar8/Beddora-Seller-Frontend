'use client'

import React, { useState } from 'react'
import { Controller, UseFormReturn, useFieldArray, useWatch } from 'react-hook-form'
import { fieldClass } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import type { LengthUnit } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { ColorSelect } from '../shared/ColorSelect'
import { CbmField } from '../shared/MeasurementFields'
import { PhotoField } from './PhotoField'
import { derivedCbm, newVariation, shownVariantName, type ProductFormValues } from './productForm'
import { SkuInput } from './SkuInput'

import { NumericInput } from '@/components/form-field/NumericInput'
interface VariationsSectionProps {
  form: UseFormReturn<ProductFormValues>
  /** Saved master id (for SKU checks and photos). */
  productId?: number
  version?: string
  photos: Map<string, File>
  onPhotoChange: (clientKey: string, file: File | null) => void
  readOnly: boolean
}

const HEAD = 'px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted'
const CELL = 'px-2 py-2 text-center align-middle'
const input = (error?: string) => cn(fieldClass(error), 'h-9 min-w-[7rem] py-1 text-sm')

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
  const [masterName, masterCategory, weightUnit, dimensionUnit, masterWeight, masterLength, masterWidth, masterHeight, masterCbm, masterCbmTouched] = useWatch({
    control,
    name: ['name', 'category', 'weightUnit', 'dimensionUnit', 'weight', 'length', 'width', 'height', 'cbm', 'cbmTouched'],
  })
  const variations = useWatch({ control, name: 'variations' }) ?? []

  const toggle = (key: string) => setOpen((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const masterDims = [masterLength, masterWidth, masterHeight].every((part) => part.trim() !== '') ? `${masterLength} × ${masterWidth} × ${masterHeight} ${dimensionUnit.toLowerCase()}` : '—'
  const masterCbmShown = derivedCbm({ length: masterLength, width: masterWidth, height: masterHeight, cbm: masterCbm, cbmTouched: masterCbmTouched }, dimensionUnit) || '—'

  const addRow = () => {
    const row = newVariation(getValues())
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
          <div className="ds-scroll-x">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="w-8" aria-label="Expand" />
                  <th className={cn(HEAD, 'min-w-[12rem]')}>Variant name</th>
                  <th className={HEAD}>SKU</th>
                  <th className={HEAD}>Color *</th>
                  <th className={HEAD}>Material</th>
                  <th className={HEAD}>Size</th>
                  <th className={HEAD}>Packaging</th>
                  <th className={HEAD} title="Category, weight, dimensions and CBM follow the master">Master dims</th>
                  <th className="w-10" aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const row = variations[index] ?? field
                  const key = row.clientKey
                  const expanded = open.has(key)
                  const err = rowErrors?.[index]
                  const hasRowError = Boolean(err && Object.keys(err).length)
                  return (
                    <React.Fragment key={field.fieldId}>
                      <tr className={cn('border-t border-border', hasRowError && 'bg-danger-50/40')}>
                        <td className={CELL}>
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-label={expanded ? 'Hide details' : 'Show details'}
                            onClick={() => toggle(key)}
                            className="rounded p-1 text-text-muted hover:bg-secondary-100"
                          >
                            <svg className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                        <td className={CELL}>
                          <input
                            aria-label="Variant name"
                            autoComplete="off"
                            placeholder="Name-Color-Size"
                            className={cn(input(err?.variantName?.message), 'min-w-[15rem]')}
                            disabled={readOnly}
                            // Shows the auto-built name until one is typed; clearing it goes back to following name, color and size
                            value={shownVariantName(row, masterName)}
                            onChange={(event) => setValue(`variations.${index}.variantName`, event.target.value, { shouldDirty: true })}
                          />
                          {err?.variantName?.message && <p className="mt-1 text-left text-xs text-danger-600">{err.variantName.message}</p>}
                        </td>
                        <td className={CELL}>
                          <SkuInput
                            compact
                            productId={productId}
                            aria-label="SKU"
                            error={err?.sku?.message}
                            className="h-9 min-w-[9rem] py-1 text-sm"
                            disabled={readOnly}
                            onTaken={(sku) => setError(`variations.${index}.sku`, { type: 'server', message: `SKU ${sku} is already used by another product` })}
                            {...register(`variations.${index}.sku`)}
                          />
                          {err?.sku?.message && <p className="mt-1 max-w-[12rem] text-left text-xs text-danger-600">{err.sku.message}</p>}
                        </td>
                        <td className={CELL}>
                          <ColorSelect
                            aria-label="Color"
                            className="h-9 min-w-[9rem] py-1 text-sm"
                            error={err?.color?.message}
                            disabled={readOnly}
                            value={row.color}
                            onChange={(color) => setValue(`variations.${index}.color`, color, { shouldDirty: true, shouldValidate: true })}
                          />
                          {err?.color?.message && <p className="mt-1 text-left text-xs text-danger-600">{err.color.message}</p>}
                        </td>
                        <td className={CELL}>
                          <input aria-label="Material" className={input(err?.material?.message)} disabled={readOnly} {...register(`variations.${index}.material`)} />
                        </td>
                        <td className={CELL}>
                          <input aria-label="Size" placeholder="e.g. Large" className={input(err?.sizeName?.message)} disabled={readOnly} {...register(`variations.${index}.sizeName`)} />
                        </td>
                        <td className={CELL}>
                          <input aria-label="Packaging" className={input(err?.packaging?.message)} disabled={readOnly} {...register(`variations.${index}.packaging`)} />
                        </td>
                        <td className={CELL}>
                          <input
                            type="checkbox"
                            aria-label="Same dims as master"
                            className="h-4 w-4 rounded"
                            disabled={readOnly}
                            {...register(`variations.${index}.inheritsMaster`, {
                              // Unchecking opens the row so its own weight and dimensions can be entered
                              onChange: (event) => !event.target.checked && setOpen((current) => new Set(current).add(key)),
                            })}
                          />
                        </td>
                        <td className={CELL}>
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
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-secondary-50/60">
                          <td />
                          <td colSpan={8} className="px-2 pb-4 pt-2">
                            <VariationDetails
                              form={form}
                              index={index}
                              readOnly={readOnly}
                              inherits={row.inheritsMaster}
                              master={{ category: masterCategory?.name ?? '—', weight: masterWeight ? `${masterWeight} ${weightUnit.toLowerCase()}` : '—', dims: masterDims, cbm: masterCbmShown }}
                              weightUnit={weightUnit}
                              dimensionUnit={dimensionUnit}
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
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-border px-4 py-3 text-xs text-text-muted">
          Fields marked * are mandatory. The category always comes from the master. Each variation is saved as its own product with its own ID and SKU, linked to this master.
        </p>
      </CardContent>
    </Card>
  )
}

interface VariationDetailsProps {
  form: UseFormReturn<ProductFormValues>
  index: number
  readOnly: boolean
  inherits: boolean
  master: { category: string; weight: string; dims: string; cbm: string }
  weightUnit: string
  dimensionUnit: LengthUnit
  photo: React.ReactNode
}

/** The expanded row: the master's values while "Master dims" is ticked, the variation's own fields when it is not. */
const VariationDetails: React.FC<VariationDetailsProps> = ({ form, index, readOnly, inherits, master, weightUnit, dimensionUnit, photo }) => {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form
  const err = errors.variations?.[index]
  const [length, width, height, cbm, cbmTouched] = useWatch({
    control,
    name: [`variations.${index}.length`, `variations.${index}.width`, `variations.${index}.height`, `variations.${index}.cbm`, `variations.${index}.cbmTouched`],
  })
  const shownCbm = derivedCbm({ length, width, height, cbm, cbmTouched }, dimensionUnit)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,2fr)_auto]">
      <Readout label="Category" value={`${master.category} · master`} />
      {inherits ? (
        <>
          <Readout label="Weight" value={`${master.weight} · master`} />
          <Readout label="L × W × H" value={`${master.dims} · master`} />
          <Readout label="CBM" value={master.cbm} />
        </>
      ) : (
        <>
          <div className="min-w-0">
            <p className="ds-input-label">Weight ({weightUnit.toLowerCase()})</p>
            <NumericInput decimal aria-label="Weight" className={cn(fieldClass(err?.weight?.message), 'text-right')} disabled={readOnly} {...register(`variations.${index}.weight`)} />
            {err?.weight?.message && <p className="mt-1 text-xs text-danger-600">{err.weight.message}</p>}
          </div>
          <div className="min-w-0">
            <p className="ds-input-label">L × W × H ({dimensionUnit.toLowerCase()})</p>
            <div className="flex items-center gap-1">
              {(['length', 'width', 'height'] as const).map((part, partIndex) => (
                <React.Fragment key={part}>
                  {partIndex > 0 && <span className="text-text-muted" aria-hidden>×</span>}
                  <NumericInput decimal aria-label={part} className={cn(fieldClass(err?.[part]?.message), 'min-w-0 px-2 text-right')} disabled={readOnly} {...register(`variations.${index}.${part}`)} />
                </React.Fragment>
              ))}
            </div>
            {(err?.length ?? err?.width ?? err?.height) && <p className="mt-1 text-xs text-danger-600">Enter L, W and H together</p>}
          </div>
          <div className="min-w-0">
            <p className="ds-input-label">CBM</p>
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
        </>
      )}
      <div className="min-w-0">
        <p className="ds-input-label">Description</p>
        <input aria-label="Description" className={fieldClass(err?.description?.message)} disabled={readOnly} {...register(`variations.${index}.description`)} />
      </div>
      <div className="min-w-0">
        <p className="ds-input-label">Photo</p>
        {photo}
      </div>
    </div>
  )
}
