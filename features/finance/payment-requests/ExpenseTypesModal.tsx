'use client'

import React, { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import {
  ExpenseType,
  useCreateExpenseTypeMutation,
  useGetExpenseTypesQuery,
  useUpdateExpenseTypeMutation,
} from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'

const ExpenseTypeRow: React.FC<{ item: ExpenseType }> = ({ item }) => {
  const { failure } = useFinanceFeedback()
  const [update, { isLoading }] = useUpdateExpenseTypeMutation()
  const [name, setName] = useState(item.name)
  const dirty = name.trim() !== item.name && name.trim().length > 0

  const patch = async (value: { name?: string; isActive?: boolean }) => {
    try {
      await update({ id: item.id, patch: value }).unwrap()
    } catch (error) {
      failure(error, 'Could not update the expense type')
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <input
        aria-label={`Name of ${item.name}`}
        className={cn('ds-input ds-input-default min-w-0 flex-1 rounded-lg', !item.isActive && 'text-text-muted line-through')}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {dirty && (
        <Button size="sm" isLoading={isLoading} onClick={() => patch({ name: name.trim() })}>
          Save
        </Button>
      )}
      <Button size="sm" variant="outline" disabled={isLoading} onClick={() => patch({ isActive: !item.isActive })}>
        {item.isActive ? 'Deactivate' : 'Activate'}
      </Button>
    </li>
  )
}

export const ExpenseTypesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { failure, success } = useFinanceFeedback()
  const { data, isLoading } = useGetExpenseTypesQuery({ includeInactive: true }, { skip: !isOpen })
  const [create, { isLoading: creating }] = useCreateExpenseTypeMutation()
  const [name, setName] = useState('')

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    try {
      await create({ name: name.trim() }).unwrap()
      success('Expense type added')
      setName('')
    } catch (error) {
      failure(error, 'Could not add the expense type')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Expense types" size="md">
      <form onSubmit={add} className="mb-3 flex gap-2">
        <input
          aria-label="New expense type"
          placeholder="New expense type"
          className="ds-input ds-input-default min-w-0 flex-1 rounded-lg"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" size="sm" isLoading={creating} disabled={!name.trim()}>
          Add
        </Button>
      </form>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <ul className="max-h-[50vh] divide-y divide-border/50 overflow-auto">
          {(data ?? []).map((item) => (
            <ExpenseTypeRow key={`${item.id}-${item.name}`} item={item} />
          ))}
          {(data ?? []).length === 0 && <li className="py-6 text-center text-sm text-text-muted">No expense types yet.</li>}
        </ul>
      )}
    </Modal>
  )
}
