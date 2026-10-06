'use client'

import React from 'react'
import { ManagedListModal } from '@/components/managed-list/ManagedListModal'
import {
  useCreateExpenseTypeMutation,
  useDeleteExpenseTypeMutation,
  useGetExpenseTypesQuery,
  useUpdateExpenseTypeMutation,
} from '@/services/api/finance.api'

export const ExpenseTypesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { data, isLoading } = useGetExpenseTypesQuery({ includeInactive: true }, { skip: !isOpen })
  const [create] = useCreateExpenseTypeMutation()
  const [update] = useUpdateExpenseTypeMutation()
  const [remove] = useDeleteExpenseTypeMutation()

  return (
    <ManagedListModal
      isOpen={isOpen}
      onClose={onClose}
      title="Expense types"
      noun="expense type"
      isLoading={isLoading}
      items={data?.map((type) => ({ id: type.id, name: type.name, isActive: type.isActive, usageCount: type.requestCount }))}
      onCreate={(name) => create({ name }).unwrap()}
      onRename={(id, name) => update({ id, patch: { name } }).unwrap()}
      onSetActive={(id, isActive) => update({ id, patch: { isActive } }).unwrap()}
      onDelete={(id) => remove(id).unwrap()}
    />
  )
}
