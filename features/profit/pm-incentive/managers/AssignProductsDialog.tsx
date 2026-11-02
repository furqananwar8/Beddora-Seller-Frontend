'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { FormActions } from '@/components/form-actions/FormActions'
import { FormField } from '@/components/form-field/FormField'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import {
  skusOn,
  useAssignManagerProductsMutation,
  useGetManagerChannelsQuery,
  useLazyGetManagerChannelSkusQuery,
  type ChannelSkuOption,
  type ProductManager,
} from '@/services/api/productManagers.api'

interface AssignProductsDialogProps {
  /** The manager the products go to; null closes the dialog. */
  manager: ProductManager | null
  onClose: () => void
}

/** A listed SKU together with the channel it is listed on. */
interface ChannelSku extends ChannelSkuOption {
  channel: string
  key: string
}

const keyOf = (channel: string, sku: string) => `${channel}|${sku}`

/** Picks the products a manager looks after from any number of channels at once. */
export const AssignProductsDialog: React.FC<AssignProductsDialogProps> = ({ manager, onClose }) => (
  <Modal isOpen={manager !== null} onClose={onClose} title={manager ? `Assign products to ${manager.name}` : 'Assign products'} size="md">
    {manager && <AssignForm key={manager.id} manager={manager} onClose={onClose} />}
  </Modal>
)

const AssignForm: React.FC<{ manager: ProductManager; onClose: () => void }> = ({ manager, onClose }) => {
  const { success, failure } = useApiFeedback()
  const [assign, { isLoading }] = useAssignManagerProductsMutation()
  const { data: channels = [] } = useGetManagerChannelsQuery()
  const [fetchSkus] = useLazyGetManagerChannelSkusQuery()

  const assigned = useMemo(() => manager.products.filter((group) => group.skus.length > 0).map((group) => group.channel), [manager])
  const [selectedChannels, setSelectedChannels] = useState<string[]>(assigned.length ? assigned : ['amazon'])
  const [pickedKeys, setPickedKeys] = useState<string[]>(() => manager.products.flatMap(({ channel, skus }) => skus.map((sku) => keyOf(channel, sku))))

  // Every selected channel's listed SKUs, fetched once each
  const [listed, setListed] = useState<Record<string, ChannelSkuOption[]>>({})
  const [loading, setLoading] = useState<string[]>([])
  useEffect(() => {
    const missing = selectedChannels.filter((channel) => !(channel in listed) && !loading.includes(channel))
    if (!missing.length) return
    setLoading((current) => [...current, ...missing])
    missing.forEach((channel) =>
      fetchSkus(channel, true)
        .unwrap()
        .catch(() => [] as ChannelSkuOption[])
        .then((skus) => {
          setListed((current) => ({ ...current, [channel]: skus }))
          setLoading((current) => current.filter((item) => item !== channel))
        }),
    )
  }, [selectedChannels, listed, loading, fetchSkus])

  const channelName = (id: string) => channels.find((channel) => channel.id === id)?.name ?? id

  // SKUs already assigned stay pickable even when the channel no longer lists them
  const options = useMemo(
    () =>
      selectedChannels.flatMap((channel) => {
        const skus = listed[channel] ?? []
        const known = new Set(skus.map((option) => option.sku))
        const kept = skusOn(manager, channel).filter((sku) => !known.has(sku)).map((sku): ChannelSkuOption => ({ sku, title: '' }))
        return [...skus, ...kept].map((option): ChannelSku => ({ ...option, channel, key: keyOf(channel, option.sku) }))
      }),
    [selectedChannels, listed, manager],
  )

  const picked = options.filter((option) => pickedKeys.includes(option.key))
  const skusOfChannel = (channel: string) => (selectedChannels.includes(channel) ? picked.filter((option) => option.channel === channel).map((option) => option.sku) : [])

  // Only channels whose SKUs differ from what the manager has are sent; a channel taken off the list releases its SKUs
  const changes = [...new Set([...assigned, ...selectedChannels])]
    .map((channel) => ({ channel, skus: skusOfChannel(channel) }))
    .filter(({ channel, skus }) => {
      const before = skusOn(manager, channel)
      return skus.length !== before.length || skus.some((sku) => !before.includes(sku))
    })

  const save = async () => {
    try {
      for (const body of changes) await assign({ id: manager.id, body }).unwrap()
      success('Products assigned')
      onClose()
    } catch (error) {
      failure(error, 'Could not assign the products')
    }
  }

  const isLoadingSkus = selectedChannels.some((channel) => !(channel in listed))

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Channels" hint="Pick every channel the manager looks after products on.">
        <MultiSelectInput
          title="Channel"
          allLabel="All channels"
          options={channels.map(({ id, name }) => ({ id, name }))}
          value={selectedChannels}
          onChange={setSelectedChannels}
          minSelected={1}
          renderValue={(selected, allSelected) => (allSelected || selected.length > 1 ? `${selected.length} channels` : (selected[0]?.name ?? 'Select channels'))}
        />
      </FormField>

      <FormField label="Products" htmlFor="pm-skus" hint="A product has one manager per channel: picking one here takes it from its current manager.">
        <SearchableSelect<ChannelSku>
          id="pm-skus"
          multiple
          options={options}
          value={picked}
          onChange={(next) => setPickedKeys((current) => [...current.filter((key) => !options.some((option) => option.key === key)), ...next.map((option) => option.key)])}
          getKey={(option) => option.key}
          getLabel={(option) => `${channelName(option.channel)} · ${option.sku}${option.title ? ` · ${option.title}` : ''}`}
          renderOption={(option) => (
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">
                {option.sku} <span className="text-xs font-normal text-text-muted">· {channelName(option.channel)}</span>
              </span>
              {option.title && <span className="truncate text-xs text-text-muted">{option.title}</span>}
            </span>
          )}
          renderValue={(next) => (next.length === 1 ? next[0].sku : `${next.length} products`)}
          loading={isLoadingSkus}
          searchable
          placeholder="Select products"
          searchPlaceholder="Search by SKU or title..."
          emptyText={isLoadingSkus ? 'Loading products...' : 'Nothing matches.'}
        />
      </FormField>

      <FormActions>
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="button" onClick={save} isLoading={isLoading} disabled={changes.length === 0}>
          Save
        </Button>
      </FormActions>
    </div>
  )
}
