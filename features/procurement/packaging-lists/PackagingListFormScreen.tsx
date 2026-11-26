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
  useFinalizePackagingListMutation,
  useGetPackableBatchLinesQuery,
  useGetPackableBatchesQuery,
  useGetPackagingListQuery,
  useGetProcurementPurchaseOrderQuery,
  useUpdatePackagingListMutation,
  type PackagingListBody,
} from '@/services/api/procurement.api'
import { serverIssues } from '@/utils/apiErrors'
import { downloadApiFile } from '@/utils/downloadFile'
import { DESTINATION_LABEL, containerLabel, supplierNames } from '../shared/poMeta'
import { PackableBatchSelect } from './PackableBatchSelect'
import { computeLine, EMPTY_LINE, lineKey, newLine, savedLine, toLineBody, type LineValue } from './packingLine'
import { PackingLinesTable } from './PackingLinesTable'

const LIST = '/dashboard/procurement/packaging-lists'
/** Tentative lists live on the first tab of the Packaging lists screen, final ones on the second. */
const listHref = (kind: 'TENTATIVE' | 'FINAL') => (kind === 'TENTATIVE' ? `${LIST}?tab=tentative` : LIST)

interface PackagingListFormScreenProps {
  /** Existing list: shown read-only, editable with `?edit=1` ("Edit quantities"), or with `?convert=1` (a tentative list being converted to final). */
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
  // Only a final list is locked by its container; a tentative one keeps changing and the container follows
  const locked = container !== null && existing?.kind === 'FINAL'
  // Converting a tentative list to final: the units become editable "Final units", next to the drafted "Units"
  const converting = !isNew && params.get('convert') === '1' && canWrite && !locked && existing?.kind === 'TENTATIVE'
  const editing = !isNew && (params.get('edit') === '1' || converting) && canWrite && !locked
  const readOnly = !isNew && !editing
  // Batches can be added or dropped until the list is converted to final
  const batchesEditable = isNew || (editing && existing?.kind === 'TENTATIVE')
  // Units may exceed the batch, tentative or final: the supplier may pack more than planned
  const allowOver = true
  const { data: fromPo } = useGetProcurementPurchaseOrderQuery(fromPoId ?? 0, { skip: !fromPoId })

  const [batchIds, setBatchIds] = useState<number[]>([])
  const [values, setValues] = useState<Map<string, LineValue>>(new Map())
  const [closePoIds, setClosePoIds] = useState<Set<number>>(new Set())
  /** SKU lines taken off this list (by {@link lineKey}); their units stay in the batch. */
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [serverErrors, setServerErrors] = useState<Map<string, string>>(new Map())
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Start from the saved list, or from the PO the user came from ("Create packaging list")
  const hydrated = useRef<string | null>(null)
  useEffect(() => {
    if (existing && hydrated.current !== `pl:${existing.id}`) {
      hydrated.current = `pl:${existing.id}`
      setBatchIds(existing.batches.map((batch) => batch.id))
      setValues(new Map(existing.lines.map((line) => [lineKey(line.batchId, line.product.id), savedLine(line)])))
    } else if (fromPo && hydrated.current !== `po:${fromPo.id}`) {
      // Coming from a PO: its batches that are in production are picked
      hydrated.current = `po:${fromPo.id}`
      setBatchIds(fromPo.batches.filter((batch) => batch.status === 'IN_PRODUCTION').map((batch) => batch.id))
    }
  }, [existing, fromPo])

  const excludeListId = packagingListId
  // Any supplier's batches: one list may carry several suppliers' goods
  const { data: batchOptions = [], isFetching: loadingOptions } = useGetPackableBatchesQuery({ excludeListId }, { skip: readOnly })
  const { data: groups = [], isFetching: loadingLines } = useGetPackableBatchLinesQuery({ batchIds, excludeListId }, { skip: batchIds.length === 0 })

  // New lines start with everything still available, in cartons the size of the product; typed values are kept when batches are added or removed
  useEffect(() => {
    if (readOnly || groups.length === 0) return
    setValues((current) => {
      let changed = false
      const next = new Map(current)
      for (const group of groups) {
        for (const line of group.lines) {
          const key = lineKey(group.batch.id, line.product.id)
          if (!next.has(key)) {
            next.set(key, newLine(line))
            changed = true
          }
        }
      }
      return changed ? next : current
    })
  }, [groups, readOnly])

  const pickedGroups = useMemo(() => groups.filter((group) => batchIds.includes(group.batch.id)), [groups, batchIds])
  const shownGroups = useMemo(
    () => pickedGroups.map((group) => ({ ...group, lines: group.lines.filter((line) => !removed.has(lineKey(group.batch.id, line.product.id))) })).filter((group) => group.lines.length > 0),
    [pickedGroups, removed]
  )
  const removedLines = pickedGroups.flatMap((group) => group.lines.filter((line) => removed.has(lineKey(group.batch.id, line.product.id))).map((line) => ({ group, line })))
  const figures = shownGroups.flatMap((group) =>
    group.lines.map((line) => ({ group, line, key: lineKey(group.batch.id, line.product.id), ...computeLine(line, values.get(lineKey(group.batch.id, line.product.id)), allowOver) }))
  )
  const hasLineErrors = figures.some((row) => Object.keys(row.errors).length > 0)
  const packedUnits = figures.reduce((sum, row) => sum + row.units, 0)

  /** POs that will keep unallocated units after this list: they can be closed on save. */
  const leftovers = [...new Map(pickedGroups.map((group) => [group.purchaseOrder.id, group.purchaseOrder])).values()]
    .map((purchaseOrder) => ({ po: purchaseOrder, groups: pickedGroups.filter((group) => group.purchaseOrder.id === purchaseOrder.id) }))
    .map(({ po, groups: poGroups }) => ({
      po,
      open: true,
      left: [
        ...figures.filter((row) => row.group.purchaseOrder.id === po.id && row.remaining > 0).map((row) => ({ sku: row.line.product.ref, units: row.remaining })),
        // A removed SKU leaves everything it had available in the batch
        ...removedLines.filter((item) => item.group.purchaseOrder.id === po.id && item.line.available > 0).map((item) => ({ sku: item.line.product.ref, units: item.line.available })),
      ],
    }))
    .filter((item) => item.open && item.left.length > 0)

  const changeLine = (key: string, field: keyof LineValue, value: string) => {
    setValues((current) => new Map(current).set(key, { ...(current.get(key) ?? EMPTY_LINE), [field]: value }))
    setServerErrors((current) => {
      if (!current.has(key)) return current
      const next = new Map(current)
      next.delete(key)
      return next
    })
  }

  const [createPl] = useCreatePackagingListMutation()
  const [updatePl] = useUpdatePackagingListMutation()
  const [finalizePl] = useFinalizePackagingListMutation()

  /** The units as first drafted, for a list being converted or already final (a final list never converted has none). */
  const draftedUnits = useMemo(() => {
    if (!existing || (existing.kind === 'FINAL' && existing.lines.every((line) => line.tentativeUnits === null))) return undefined
    return new Map(existing.lines.map((line) => [lineKey(line.batchId, line.product.id), line.tentativeUnits ?? line.units]))
  }, [existing])

  const save = async () => {
    setFormError(null)
    if (batchIds.length === 0) return setFormError('Pick at least one batch')
    if (packedUnits === 0) return setFormError('Pack at least one unit')
    if (hasLineErrors) return setFormError('Fix the highlighted lines first')
    const lines = figures.map((row) => toLineBody(row.group.batch.id, row.line.product.id, row, values.get(row.key)))
    const body: PackagingListBody = {
      batchIds,
      lines,
      closePurchaseOrderIds: [...closePoIds].filter((id) => pickedGroups.some((group) => group.purchaseOrder.id === id)),
      ...(existing && { expectedUpdatedAt: existing.updatedAt }),
    }
    setSaving(true)
    try {
      const saved = existing ? await (converting ? finalizePl({ id: existing.id, body }) : updatePl({ id: existing.id, body })).unwrap() : await createPl(body).unwrap()
      success(converting ? `${saved.plNo} converted to final. It now shows on the Packaging list tab.` : existing ? `${saved.plNo} saved` : `${saved.plNo} created as a tentative list`)
      router.push(listHref(saved.kind))
    } catch (error) {
      // Line problems from the server (e.g. someone packed the same units meanwhile) land on their rows
      const byLine = new Map<string, string>()
      for (const issue of serverIssues(error)) {
        const match = /^lines\.(\d+)\./.exec(issue.field)
        if (match && lines[Number(match[1])]) byLine.set(lineKey(lines[Number(match[1])].batchId, lines[Number(match[1])].productId), issue.message)
      }
      setServerErrors(byLine)
      failure(error, converting ? 'Could not convert the packaging list' : 'Could not save the packaging list')
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

  const title = existing ? (converting ? `Convert ${existing.plNo} to final` : existing.plNo) : 'New tentative packaging list'
  const backHref = listHref(existing?.kind ?? 'TENTATIVE')
  const destination = batchOptions.find((batch) => batchIds.includes(batch.id))?.destination ?? existing?.destination

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">{title}</h1>
          {isNew && <StatusBadge label="TENTATIVE" tone="warning" />}
          {existing && <StatusBadge label={existing.kind === 'TENTATIVE' ? 'TENTATIVE' : 'FINAL'} tone={existing.kind === 'TENTATIVE' ? 'warning' : 'success'} />}
          {editing && <StatusBadge label={converting ? 'Confirming final units' : 'Editing quantities'} tone="info" />}
          {destination && <StatusBadge label={DESTINATION_LABEL[destination]} tone="neutral" />}
          {container && <StatusBadge label={`In ${containerLabel(container)}`} tone="info" />}
        </div>
        {container && (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            {locked
              ? `This list is in ${containerLabel(container)}, so its quantities are locked.`
              : `This tentative list is in ${containerLabel(container)}. Changes you save here update the container until the list is made final.`}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Batches</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Batch(es)"
              htmlFor="pl-batches"
              required
              hint={batchesEditable ? 'Batches IN PRODUCTION only. One batch, or several (any POs and suppliers) that ship to the same destination. A batch has one packaging list.' : 'The batches of a final list are fixed'}
            >
              {!batchesEditable && existing ? (
                // A final list's batches are fixed: shown as they are, with their suppliers
                <p id="pl-batches" className="rounded-lg border border-border bg-secondary-50 px-3 py-2 text-sm text-text-primary">
                  <span className="font-mono font-semibold">{existing.batches.map((batch) => batch.label).join(', ')}</span>
                  <span className="text-text-muted"> · {supplierNames(existing.suppliers)}</span>
                </p>
              ) : (
                <PackableBatchSelect id="pl-batches" options={batchOptions} value={batchIds} onChange={setBatchIds} loading={loadingOptions} />
              )}
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SKU lines</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {batchIds.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">Pick a batch to load its SKU lines.</p>
            ) : loadingLines && shownGroups.length === 0 ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <>
                {shownGroups.length > 0 ? (
                  <PackingLinesTable
                    groups={shownGroups}
                    values={values}
                    onChange={changeLine}
                    serverErrors={serverErrors}
                    readOnly={readOnly}
                    onRemove={converting ? undefined : (key) => setRemoved((current) => new Set(current).add(key))}
                    draftedUnits={draftedUnits}
                    allowOverAllocation={allowOver}
                  />
                ) : (
                  <p className="py-6 text-center text-sm text-text-muted">Every SKU is removed from this list.</p>
                )}
                {!readOnly && removedLines.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary-50 px-3 py-2 text-sm text-text-secondary">
                    <span>
                      Removed from this list (still available in the batch): {removedLines.map((item) => item.line.product.ref).join(', ')}
                    </span>
                    <button type="button" onClick={() => setRemoved(new Set())} className="font-medium text-text-primary underline-offset-2 hover:underline">
                      Restore
                    </button>
                  </div>
                )}
              </>
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
          <Button type="button" variant="outline" onClick={() => router.push(backHref)} disabled={saving}>
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
          {readOnly && canWrite && existing && !locked && (
            <Button type="button" variant={existing.kind === 'TENTATIVE' ? 'outline' : 'primary'} onClick={() => router.push(`${LIST}/${existing.id}?edit=1`)}>
              Edit quantities
            </Button>
          )}
          {readOnly && canWrite && existing?.kind === 'TENTATIVE' && !locked && (
            <Button type="button" onClick={() => router.push(`${LIST}/${existing.id}?convert=1`)}>
              Convert to final
            </Button>
          )}
          {!readOnly && (
            <Button type="button" onClick={() => void save()} isLoading={saving} disabled={hasLineErrors || packedUnits === 0}>
              {converting ? 'Convert to final' : existing ? 'Save packaging list' : 'Save tentative packaging list'}
            </Button>
          )}
        </FormActions>
      </div>
    </Container>
  )
}
