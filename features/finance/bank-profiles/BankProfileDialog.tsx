'use client'

import React, { useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/design-system/buttons'
import { Select } from '@/design-system/inputs'
import { Modal } from '@/design-system/modals/Modal'
import { FileDropzone } from '@/components/file-dropzone/FileDropzone'
import type { BankProfile } from '@/services/api/finance.api'
import { CURRENCIES } from '../partners/partnerSchema'
import { BankAccountFields } from '../shared/BankAccountFields'
import { DocumentChips } from '../shared/DocumentChips'
import { FormField, fieldClass } from '../shared/FormField'
import { SelectShell } from '../shared/SelectShell'
import { bankProfileFormValues, emptyBankProfileValues, makeBankProfileSchema, type BankProfileFormValues } from './bankProfileSchema'
import { useSaveBankProfile } from './useSaveBankProfile'

interface BankProfileDialogProps {
  isOpen: boolean
  /** The profile to edit; omit to add a new one. */
  profile?: BankProfile | null
  onClose: () => void
  /** Called with the saved profile; the dialog closes itself. */
  onSaved?: (profile: BankProfile) => void
}

/** Adds or edits a company bank account. */
export const BankProfileDialog: React.FC<BankProfileDialogProps> = (props) => (
  <Modal isOpen={props.isOpen} onClose={props.onClose} title={props.profile ? 'Edit bank details' : 'Add bank details'} size="md">
    {props.isOpen && <DialogForm key={props.profile?.id ?? 'new'} {...props} />}
  </Modal>
)

const DialogForm: React.FC<BankProfileDialogProps> = ({ profile, onClose, onSaved }) => {
  const editing = Boolean(profile)
  const [files, setFiles] = useState<File[]>([])
  const save = useSaveBankProfile(profile ?? undefined)
  const form = useForm<BankProfileFormValues>({
    resolver: zodResolver(makeBankProfileSchema(editing)),
    defaultValues: profile ? bankProfileFormValues(profile) : emptyBankProfileValues,
  })
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form
  const currencyOptions = [...new Set([...CURRENCIES, form.getValues('currency')])].map((code) => ({ value: code, label: code }))

  const submit = handleSubmit(async (values) => {
    const saved = await save(values, files)
    if (!saved) return
    onSaved?.(saved)
    onClose()
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="-mt-1 text-sm text-text-muted">Bank profile · {profile ? profile.name : 'New'}</p>

        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <FormField label="Bank Name" htmlFor="bp-name" required error={errors.name?.message}>
            <input id="bp-name" autoComplete="off" placeholder="e.g. RBC operating account" className={fieldClass(errors.name?.message)} {...register('name')} />
          </FormField>
          <FormField label="Currency" htmlFor="bp-currency" required error={errors.currency?.message}>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <SelectShell>
                  <Select id="bp-currency" className="appearance-none rounded-lg pr-9" value={field.value} onChange={field.onChange} options={currencyOptions} />
                </SelectShell>
              )}
            />
          </FormField>
        </div>

        <BankAccountFields
          idPrefix="bp"
          swiftRequired={false}
          holderLabel="Account Title"
          identifierHint={profile ? `Saved: ${profile.label}. Leave both blank to keep it.` : undefined}
        />

        <FormField label="Credit Card Name" htmlFor="bp-card" error={errors.creditCardName?.message} hint="Optional · card issued against this account">
          <input id="bp-card" autoComplete="off" className={fieldClass(errors.creditCardName?.message)} {...register('creditCardName')} />
        </FormField>

        <FormField label="Documents">
          {profile && <DocumentChips documents={profile.documents} emptyText={null} className="mb-2" />}
          <FileDropzone multiple files={files} onChange={setFiles} title={profile ? 'Upload more documents' : 'Upload documents'} hint="Void cheque / bank letter" />
        </FormField>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {editing ? 'Save' : 'Add'}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
