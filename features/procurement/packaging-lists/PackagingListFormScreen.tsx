'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormActions } from '@/components/form-actions/FormActions'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useCreatePackagingListMutation,
  useGetPackablePoLinesQuery,
  useGetPackablePurchaseOrdersQuery,
  useGetPackagingListQuery,
  useGetProcurementPurchaseOrderQuery,
  useUpdatePackagingListMutation,
  type PackagingListBody,
  type SupplierRef,
} from '@/services/api/procurement.api'
import { serverIssues } from '@/utils/apiErrors'
import { downloadApiFile } from '@/utils/downloadFile'
import { DESTINATION_LABEL } from '../shared/poMeta'
import { SupplierSelect } from '../shared/SupplierSelect'
import { PackablePoSelect } from './PackablePoSelect'
import { computeLine, lineKey, PackingLinesTable, type LineValue } from './PackingLinesTable'

const LIST = '/dashboard/procurement/packaging-lists'

interface PackagingListFormScreenProps {
  /** Existing list: shown read-only, or editable with `?edit=1` ("Edit quantities"). */
  packagingListId?: number
}

export const PackagingListFormScreen: React.FC<PackagingListFormScreenProps> = ({ packagingListId }) => {
  const router = useRouter()
  const params = useSearchParams()
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'procurement:packaging-lists')
  const { success, failure } = useApiFeedback()

  const isNew = packagingListId === undefined
  const fromPoParam = Number(params.get('purchaseOrderId'))
  const fromPoId = isNew && Number.isInteger(fromPoParam) && fromPoParam > 0 ? fromPoParam : undefined

  const { data: existing, isLoading: loadingExisting, isError: existingError } = useGetPackagingListQuery(packagingListId ?? 0, { skip: isNew })
  // A list in a container has shipped: it stays read-only until it is taken out
  const container = existing?.container ?? null
  const editing = !isNew && params.get('edit') === '1' && canWrite && !container
  const readOnly = !isNew && !editing
  const { data: fromPo } = useGetProcurementPurchaseOrderQuery(fromPoId ?? 0, { skip: !fromPoId })

  const [supplier, setSupplier] = useState<SupplierRef | null>(null)
  const [poIds, setPoIds] = useState<number[]>([])
  const [values, setValues] = useState<Map<string, LineValue>>(new Map())
  const [closePoIds, setClosePoIds] = useState<Set<number>>(new Set())
  const [serverErrors, setServerErrors] = useState<Map<string, string>>(new Map())
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Start from the saved list, or from the PO the user came from ("Create packaging list")
  const hydrated = useRef<string | null>(null)
  useEffect(() => {
    if (existing && hydrated.current !== `pl:${existing.id}`) {
      hydrated.current = `pl:${existing.id}`
      setSupplier({ id: existing.supplier.id, name: existing.supplier.name, contactName: existing.supplier.contactName, country: null, currency: '' })
      setPoIds(existing.purchaseOrders.map((po) => po.id))
      // A gross weight equal to the net was never typed (empty saves as net): leave it empty so it keeps following the net
      setValues(
        new Map(
          existing.lines.map((line) => [
            lineKey(line.purchaseOrderId, line.product.id),
            { units: String(line.units), cartons: String(line.cartons), gross: line.grossWeightKg === line.netWeightKg ? '' : String(line.grossWeightKg) },
          ])
        )
      )
    } else if (fromPo && hydrated.current !== `po:${fromPo.id}`) {
      hydrated.current = `po:${fromPo.id}`
      setSupplier(fromPo.supplier)
      setPoIds([fromPo.id])
    }
  }, [existing, fromPo])

  const excludeListId = packagingListId
  const { data: poOptions = [], isFetching: loadingOptions } = useGetPackablePurchaseOrdersQuery({ supplierId: supplier?.id ?? 0, excludeListId }, { skip: !supplier })
  const { data: groups = [], isFetching: loadingLines } = useGetPackablePoLinesQuery({ purchaseOrderIds: poIds, excludeListId }, { skip: poIds.length === 0 })

  // New lines start with everything still available; typed values are kept when POs are added or removed
  useEffect(() => {
    if (readOnly || groups.length === 0) return
    setValues((current) => {
      let changed = false
      const next = new Map(current)
      for (const group of groups) {
        for (const line of group.lines) {
          const key = lineKey(group.purchaseOrder.id, line.product.id)
          if (!next.has(key)) {
            next.set(key, { units: String(line.available), cartons: '', gross: '' })
            changed = true
          }
        }
      }
      return changed ? next : current
    })
  }, [groups, readOnly])

  const shownGroups = useMemo(() => groups.filter((group) => poIds.includes(group.purchaseOrder.id)), [groups, poIds])
  const figures = shownGroups.flatMap((group) =>
    group.lines.map((line) => ({ group, line, key: lineKey(group.purchaseOrder.id, line.product.id), ...computeLine(line, values.get(lineKey(group.purchaseOrder.id, line.product.id))) }))
  )
  const hasLineErrors = figures.some((row) => Object.keys(row.errors).length > 0)
  const packedUnits = figures.reduce((sum, row) => sum + row.units, 0)
  const overAllocated = figures.filter((row) => row.units > row.line.available)

  /** POs that will keep unallocated units after this list: they can be closed on save. */
  const leftovers = shownGroups
    .map((group) => ({
      po: group.purchaseOrder,
      open: poOptions.find((option) => option.id === group.purchaseOrder.id)?.isOpen ?? true,
      left: figures.filter((row) => row.group.purchaseOrder.id === group.purchaseOrder.id && row.remaining > 0).map((row) => ({ sku: row.line.product.ref, units: row.remaining })),
    }))
    .filter((item) => item.open && item.left.length > 0)

  const changeLine = (key: string, field: keyof LineValue, value: string) => {
    setValues((current) => new Map(current).set(key, { ...(current.get(key) ?? { units: '', cartons: '', gross: '' }), [field]: value }))
    setServerErrors((current) => {
      if (!current.has(key)) return current
      const next = new Map(current)
      next.delete(key)
      return next
    })
  }

  const pickSupplier = (next: SupplierRef) => {
    if (next.id === supplier?.id) return
    setSupplier(next)
    setPoIds([])
    setValues(new Map())
    setClosePoIds(new Set())
  }

  const [createPl] = useCreatePackagingListMutation()
  const [updatePl] = useUpdatePackagingListMutation()

  const save = async () => {
    setFormError(null)
    if (!supplier || poIds.length === 0) return setFormError('Pick the supplier and at least one purchase order')
    if (packedUnits === 0) return setFormError('Pack at least one unit')
    if (hasLineErrors) return setFormError('Fix the highlighted lines first')
    const lines = figures.map((row) => ({
      purchaseOrderId: row.group.purchaseOrder.id,
      productId: row.line.product.id,
      units: row.units,
      cartons: row.cartons,
      grossWeightKg: values.get(row.key)?.gross.trim() ? Number(values.get(row.key)!.gross) : 0,
    }))
    const body: PackagingListBody = {
      supplierId: supplier.id,
      purchaseOrderIds: poIds,
      lines,
      closePurchaseOrderIds: [...closePoIds].filter((id) => poIds.includes(id)),
      ...(existing && { expectedUpdatedAt: existing.updatedAt }),
    }
    setSaving(true)
    try {
      const saved = existing ? await updatePl({ id: existing.id, body }).unwrap() : await createPl(body).unwrap()
      success(existing ? `${saved.plNo} saved` : `${saved.plNo} created`)
      router.push(LIST)
    } catch (error) {
      // Line problems from the server (e.g. someone packed the same units meanwhile) land on their rows
      const byLine = new Map<string, string>()
      for (const issue of serverIssues(error)) {
        const match = /^lines\.(\d+)\./.exec(issue.field)
        if (match && lines[Number(match[1])]) byLine.set(lineKey(lines[Number(match[1])].purchaseOrderId, lines[Number(match[1])].productId), issue.message)
      }
      setServerErrors(byLine)
      failure(error, 'Could not save the packaging list')
    } finally {
      setSaving(false)
    }
  }

  if (!isNew && loadingExisting) {
    return (
      <Container size="full" className="flex justify-center py-16">
        <Spinner />
      </Container>
    )
  }
  if (!isNew && (existingError || !existing)) {
    return (
      <Container size="full" className="py-16 text-center">
        <p className="font-medium text-text-primary">This packaging list could not be found.</p>
        <Link href={LIST} className="mt-2 inline-block text-sm text-primary-600 hover:underline">
          Back to packaging lists
        </Link>
      </Container>
    )
  }

  const title = existing ? existing.plNo : 'New packaging list'
  const destination = poOptions.find((po) => poIds.includes(po.id))?.destination ?? existing?.destination

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">{title}</h1>
          {isNew && <StatusBadge label="Draft" tone="neutral" />}
          {editing && <StatusBadge label="Editing quantities" tone="info" />}
          {destination && <StatusBadge label={DESTINATION_LABEL[destination]} tone="neutral" />}
          {container && <StatusBadge label={`In ${container.containerNo}`} tone="info" />}
        </div>
        {container && (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            This list is in {container.containerNo}, so its quantities are locked. Take it out of the container (Packaging lists → Change container) to edit them.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Supplier &amp; purchase orders</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField label="Supplier" htmlFor="pl-supplier" required hint={isNew ? 'Shared supplier list; shown as the Supplier column in the listing' : undefined}>
              <SupplierSelect id="pl-supplier" value={supplier} onChange={pickSupplier} disabled={!isNew} />
            </FormField>
            <FormField
              label="Purchase order(s)"
              htmlFor="pl-pos"
              required
              hint={isNew ? 'One PO, or several POs that have no packaging list yet and ship to the same destination. Pending POs cannot be packed.' : 'The POs of a saved list are fixed'}
            >
              <PackablePoSelect id="pl-pos" options={poOptions} value={poIds} onChange={setPoIds} loading={loadingOptions} disabled={!isNew || !supplier} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SKU lines</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {poIds.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">Pick a supplier and purchase order to load its SKU lines.</p>
            ) : loadingLines && shownGroups.length === 0 ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <PackingLinesTable groups={shownGroups} values={values} onChange={changeLine} serverErrors={serverErrors} readOnly={readOnly} />
            )}
            {overAllocated.length > 0 && (
              <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                <strong>Over-allocation is blocked:</strong>{' '}
                {overAllocated.map((row) => `${row.line.product.ref} has only ${row.line.available.toLocaleString('en-CA')} available`).join('; ')}.
              </p>
            )}
          </CardContent>
        </Card>

        {!readOnly && leftovers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>After saving</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {leftovers.map(({ po, left }) => (
                <label key={po.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded"
                    checked={closePoIds.has(po.id)}
                    onChange={(event) =>
                      setClosePoIds((current) => {
                        const next = new Set(current)
                        if (event.target.checked) next.add(po.id)
                        else next.delete(po.id)
                        return next
                      })
                    }
                  />
                  <span className="text-sm">
                    <span className="font-semibold text-text-primary">Close {po.poNo}</span>
                    <span className="block text-text-muted">
                      {left.map((item) => `${item.units.toLocaleString('en-CA')} units of ${item.sku}`).join(', ')} stay unallocated. They can move to a new PO with “Create PO from remaining”.
                    </span>
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
        )}

        {formError && (
          <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {formError}
          </p>
        )}

        <FormActions>
          <Button type="button" variant="outline" onClick={() => router.push(LIST)} disabled={saving}>
            {readOnly ? 'Back' : 'Cancel'}
          </Button>
          {existing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void downloadApiFile(`/procurement/packaging-lists/${existing.id}/pdf`, `${existing.plNo.replace('#', '')}.pdf`).catch((error) => failure(error, 'Could not download the PDF'))}
            >
              Download PDF
            </Button>
          )}
          {readOnly && canWrite && existing && !container && (
            <Button type="button" onClick={() => router.push(`${LIST}/${existing.id}?edit=1`)}>
              Edit quantities
            </Button>
          )}
          {!readOnly && (
            <Button type="button" onClick={() => void save()} isLoading={saving} disabled={hasLineErrors || packedUnits === 0}>
              Save packaging list
            </Button>
          )}
        </FormActions>
      </div>
    </Container>
  )
}
