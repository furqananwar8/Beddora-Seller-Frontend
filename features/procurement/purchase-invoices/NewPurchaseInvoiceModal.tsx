'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormField } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useGetProcurementPurchaseOrdersQuery, type PoStatus, type PurchaseOrderListItem } from '@/services/api/procurement.api'
import { useDebounce } from '@/utils/debounce'
import { DESTINATION_LABEL, PO_STATUS_META, isApprovedPo, newPurchaseInvoiceHref } from '../shared/poMeta'

/** Only an approved purchase order can be invoiced. */
const APPROVED_STATUSES = (Object.keys(PO_STATUS_META) as PoStatus[]).filter((status) => isApprovedPo({ status }))

/** "Create purchase invoice" from the invoice list: pick the approved purchase order it is raised from, then fill it in on its own page. */
export const NewPurchaseInvoiceModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const router = useRouter()
  const [po, setPo] = useState<PurchaseOrderListItem | null>(null)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search.trim(), 300)
  const { data, isFetching } = useGetProcurementPurchaseOrdersQuery({ page: 1, limit: 20, search: debounced, statuses: APPROVED_STATUSES }, { skip: !isOpen })

  const close = () => {
    setPo(null)
    setSearch('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Create purchase invoice" size="md" closeOnEscape className="sm:overflow-visible">
      <div className="flex flex-col gap-4">
        <FormField label="Purchase order" htmlFor="pi-new-po" required hint="The approved purchase order this invoice is raised from">
          <SearchableSelect<PurchaseOrderListItem>
            id="pi-new-po"
            value={po}
            onChange={setPo}
            options={data?.data ?? []}
            getKey={(item) => item.id}
            getLabel={(item) => `${item.poNo} ${item.supplier.name}`}
            renderOption={(item) => (
              <span className="flex items-center justify-between gap-3">
                <span className="font-medium">
                  {item.poNo} <span className="font-normal text-text-secondary">· {item.supplier.name}</span>
                </span>
                <span className="shrink-0 text-xs text-text-muted">{DESTINATION_LABEL[item.destination]}</span>
              </span>
            )}
            search={search}
            onSearchChange={setSearch}
            loading={isFetching}
            placeholder="Select the purchase order"
            searchPlaceholder="PO number or supplier..."
            emptyText="No approved purchase order matches."
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" disabled={!po} onClick={() => po && router.push(newPurchaseInvoiceHref(po.id))}>
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  )
}
