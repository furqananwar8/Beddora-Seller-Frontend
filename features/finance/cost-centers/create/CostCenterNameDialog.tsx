'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Modal } from '@/design-system/modals'

const MAX_NAME = 120

interface CostCenterNameDialogProps {
  isOpen: boolean
  title: string
  /** Where the entry goes, e.g. "Under Expense › Trucking Cost". */
  context?: string
  initialName?: string
  submitLabel: string
  /** Names already used by its siblings (lower-cased); a cost center's name is unique among them. */
  takenNames: Set<string>
  onSubmit: (name: string) => void
  onClose: () => void
}

/** Name of a new or edited cost center entry. Nothing is saved until the create screen is submitted. */
export const CostCenterNameDialog: React.FC<CostCenterNameDialogProps> = ({ isOpen, title, context, initialName = '', submitLabel, takenNames, onSubmit, onClose }) => {
  const [name, setName] = useState(initialName)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setName(initialName)
    setTouched(false)
  }, [isOpen, initialName])

  const trimmed = name.trim()
  const error = !trimmed
    ? 'Name is required'
    : trimmed.length > MAX_NAME
      ? `Keep it under ${MAX_NAME} characters`
      : trimmed.toLowerCase() !== initialName.trim().toLowerCase() && takenNames.has(trimmed.toLowerCase())
        ? `"${trimmed}" already exists at this level`
        : undefined

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (!error) onSubmit(trimmed)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" closeOnEscape>
      <form onSubmit={submit} noValidate>
        {context && <p className="mb-3 text-sm text-text-muted">{context}</p>}
        <Input label="Name" autoFocus value={name} maxLength={MAX_NAME + 1} onChange={(event) => setName(event.target.value)} error={touched ? error : undefined} />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  )
}
