'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/design-system/buttons'
import { Select } from '@/design-system/inputs'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useGetScanSourceQuery, useStartScanSessionMutation, type ScanDirection } from '@/services/api/barcode.api'
import { DIRECTION_META, conditionName, conditionsFor, inHint, isReceipt, sessionHref, type ScanTarget } from './scanSession'

const schema = z.object({
  direction: z.enum(['IN', 'OUT']),
  condition: z.enum(['SELLABLE', 'NORMAL_RETURN', 'DAMAGED']),
})
type FormValues = z.infer<typeof schema>

const DIRECTIONS: ScanDirection[] = ['OUT', 'IN']

interface Props {
  target: ScanTarget
  onClose: () => void
}

/**
 * "Is this inventory In or Out?" The same question for an FBM order and an FBA/WFS shipment: Out takes the units
 * out of stock, In puts returned units back and asks what state they came back in. The record decides which
 * directions are open; a closed one says why.
 */
export function ScanItemsDialog({ target, onClose }: Props) {
  const router = useRouter()
  const feedback = useApiFeedback()
  const { data: info, isLoading, isError, error } = useGetScanSourceQuery(target)
  const [start, { isLoading: starting }] = useStartScanSessionMutation()

  const { register, watch, setValue, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { direction: 'OUT', condition: 'SELLABLE' },
  })
  const direction = watch('direction')

  // Start on the first open direction, so the common case is one click
  const firstOpen = useMemo(() => (info ? DIRECTIONS.find((d) => !info.availability[d]) : undefined), [info])
  useEffect(() => {
    if (firstOpen) setValue('direction', firstOpen)
  }, [firstOpen, setValue])

  const submit = handleSubmit(async ({ direction: dir, condition }) => {
    try {
      const session = await start({ ...target, direction: dir }).unwrap()
      router.push(sessionHref(session.id, dir === 'IN' ? condition : undefined))
    } catch (e) {
      feedback.failure(e, 'Could not start scanning')
    }
  })

  return (
    <Modal isOpen onClose={onClose} title={info ? `Scan items · ${info.ref}` : 'Scan items'} size="md">
      {isLoading && (
        <div className="flex justify-center p-8">
          <Spinner size="sm" />
        </div>
      )}
      {isError && <p className="text-sm text-danger-600">{(error as { data?: { error?: string } })?.data?.error ?? 'Could not open this record for scanning.'}</p>}

      {info && (
        <form onSubmit={submit} className="space-y-4">
          {info.resume && (
            <div className="rounded-lg border border-border bg-surface-secondary p-3 text-sm">
              You have a {DIRECTION_META[info.resume.direction].label.toLowerCase()} scan open on this record.
              <Button type="button" variant="outline" size="sm" className="ml-3" onClick={() => router.push(sessionHref(info.resume!.id))}>
                Resume scanning
              </Button>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-text-primary">Is this inventory in or out?</legend>
            {DIRECTIONS.map((value) => {
              const reason = info.availability[value]
              return (
                <label
                  key={value}
                  className={`flex items-start gap-3 rounded-lg border border-border p-3 ${reason ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-secondary-50'}`}
                >
                  <input type="radio" value={value} disabled={Boolean(reason)} className="mt-1" {...register('direction')} />
                  <span>
                    <span className="block text-sm font-medium text-text-primary">{DIRECTION_META[value].label}</span>
                    <span className="block text-xs text-text-muted">{reason ?? (value === 'IN' ? inHint(target.scenario) : DIRECTION_META[value].hint)}</span>
                  </span>
                </label>
              )
            })}
          </fieldset>

          {direction === 'IN' && (
            <Select
              label={isReceipt(target.scenario) ? 'Condition of the received items' : 'Condition of the returned items'}
              helperText="Sets where the units are added. You can change it between scans."
              options={info.conditions.filter((c) => conditionsFor(target.scenario).includes(c.value)).map((c) => ({ value: c.value, label: conditionName(target.scenario, c.value, c.label) }))}
              {...register('condition')}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!firstOpen || Boolean(info.availability[direction]) || starting}>
              {starting ? 'Starting…' : 'Start scanning'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
