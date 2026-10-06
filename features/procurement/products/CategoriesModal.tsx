'use client'

import React from 'react'
import { ManagedListModal } from '@/components/managed-list/ManagedListModal'
import {
  useCreatePoCategoryMutation,
  useDeletePoCategoryMutation,
  useGetPoCategoriesQuery,
  useUpdatePoCategoryMutation,
} from '@/services/api/procurement.api'

/** Product categories: add, rename, deactivate, and delete the ones no product uses. */
export const CategoriesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { data, isLoading } = useGetPoCategoriesQuery({ includeInactive: true }, { skip: !isOpen })
  const [create] = useCreatePoCategoryMutation()
  const [update] = useUpdatePoCategoryMutation()
  const [remove] = useDeletePoCategoryMutation()

  return (
    <ManagedListModal
      isOpen={isOpen}
      onClose={onClose}
      title="Product categories"
      noun="category"
      isLoading={isLoading}
      items={data?.map((category) => ({ id: category.id, name: category.name, isActive: category.isActive, usageCount: category.productCount }))}
      onCreate={(name) => create(name).unwrap()}
      onRename={(id, name) => update({ id, patch: { name } }).unwrap()}
      onSetActive={(id, isActive) => update({ id, patch: { isActive } }).unwrap()}
      onDelete={(id) => remove(id).unwrap()}
    />
  )
}
