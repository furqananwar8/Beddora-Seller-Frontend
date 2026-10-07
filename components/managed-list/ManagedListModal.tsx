'use client'

import React, { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { cn } from '@/utils/cn'

export interface ManagedItem {
  id: number
  name: string
  isActive: boolean
  /** How many records use it. Unused items can be deleted; used ones can only be deactivated. */
  usageCount?: number
}

interface ManagedListModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  /** Lower-case singular used in messages and labels, e.g. "category". */
  noun: string
  items: ManagedItem[] | undefined
  isLoading: boolean
  onCreate: (name: string) => Promise<unknown>
  onRename: (id: number, name: string) => Promise<unknown>
  onSetActive: (id: number, isActive: boolean) => Promise<unknown>
  onDelete: (id: number) => Promise<unknown>
}

interface RowProps extends Pick<ManagedListModalProps, 'noun' | 'onRename' | 'onSetActive' | 'onDelete'> {
  item: ManagedItem
}

const Row: React.FC<RowProps> = ({ item, noun, onRename, onSetActive, onDelete }) => {
  const { failure } = useApiFeedback()
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [name, setName] = useState(item.name)
  const deletable = item.usageCount === 0
  const dirty = name.trim() !== item.name && name.trim().length > 0

  const run = async (job: () => Promise<unknown>, fallback: string) => {
    setBusy(true)
    try {
      await job()
    } catch (error) {
      setConfirmingDelete(false)
      failure(error, fallback)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <input
        aria-label={`Name of ${item.name}`}
        className={cn('ds-input ds-input-default min-w-0 flex-1 rounded-lg', !item.isActive && 'text-text-muted line-through')}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      {dirty && (
        <Button size="sm" isLoading={busy} onClick={() => run(() => onRename(item.id, name.trim()), `Could not update the ${noun}`)}>
          Save
        </Button>
      )}
      {confirmingDelete ? (
        <>
          <Button size="sm" variant="danger" isLoading={busy} onClick={() => run(() => onDelete(item.id), `Could not delete the ${noun}`)}>
            Confirm delete
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmingDelete(false)}>
            Keep
          </Button>
        </>
      ) : (
        <>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => onSetActive(item.id, !item.isActive), `Could not update the ${noun}`)}>
            {item.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          {deletable ? (
            <Button size="sm" variant="outline" className="text-danger-600" disabled={busy} onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          ) : (
            item.usageCount !== undefined && (
              <span className="text-xs text-text-muted" title="It stays for the history; deactivate it to stop using it.">
                Used by {item.usageCount}
              </span>
            )
          )}
        </>
      )}
    </li>
  )
}

/** Add, rename, deactivate and delete the entries of a small named list (expense types, product categories). */
export const ManagedListModal: React.FC<ManagedListModalProps> = ({ isOpen, onClose, title, noun, items, isLoading, onCreate, onRename, onSetActive, onDelete }) => {
  const { failure, success } = useApiFeedback()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      await onCreate(name.trim())
      success(`${noun[0].toUpperCase()}${noun.slice(1)} added`)
      setName('')
    } catch (error) {
      failure(error, `Could not add the ${noun}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <form onSubmit={add} className="mb-3 flex gap-2">
        <input
          aria-label={`New ${noun}`}
          placeholder={`New ${noun}`}
          className="ds-input ds-input-default min-w-0 flex-1 rounded-lg"
          value={name}
          onChange={(event) => setName(event.target.value)}
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
          {(items ?? []).map((item) => (
            <Row key={`${item.id}-${item.name}`} item={item} noun={noun} onRename={onRename} onSetActive={onSetActive} onDelete={onDelete} />
          ))}
          {(items ?? []).length === 0 && <li className="py-6 text-center text-sm text-text-muted">No {noun}s yet.</li>}
        </ul>
      )}
    </Modal>
  )
}
