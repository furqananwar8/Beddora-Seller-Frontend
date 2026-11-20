'use client'

import React, { useRef, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useGetApprovalUsersQuery,
  useGetDepartmentsQuery,
  useGetNotificationEventQuery,
  useGetNotificationEventsQuery,
  useGetNotificationTabsQuery,
  useSaveNotificationEventMutation,
  type NotificationEvent,
  type PersonRef,
  type RecipientLine,
  type TabOption,
} from '@/services/api/approvals.api'
import { Switch } from '@/components/switch/Switch'
import type { Slots } from './ApprovalsScreen'
import { fieldClass } from '@/components/form-field/FormField'
import { Btn, FooterBar, OnOff, PaneTitle, RemoveBtn, SectionLabel, Select, SideItem, SideTitle, TwoPane } from './ui'
import { cn } from '@/utils/cn'

const GROUP_ORDER = ['Finance', 'Containers', 'Shipping', 'Procurement']

const KINDS = [
  { value: 'CREATOR', label: 'The creator' },
  { value: 'TAB_ACCESS', label: 'Everyone with access to' },
  { value: 'DEPARTMENT', label: 'A department' },
  { value: 'USER', label: 'A person' },
] as const

type Kind = (typeof KINDS)[number]['value']

const rowSchema = z
  .object({ kind: z.enum(['CREATOR', 'TAB_ACCESS', 'DEPARTMENT', 'USER']), permissionPage: z.string(), departmentId: z.string(), userId: z.string() })
  .superRefine((row, ctx) => {
    const missing = (field: 'permissionPage' | 'departmentId' | 'userId', message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message })
    if (row.kind === 'TAB_ACCESS' && !row.permissionPage) missing('permissionPage', 'Pick a tab')
    if (row.kind === 'DEPARTMENT' && !row.departmentId) missing('departmentId', 'Pick a department')
    if (row.kind === 'USER' && !row.userId) missing('userId', 'Pick a person')
  })

const schema = z.object({
  isActive: z.boolean(),
  inApp: z.boolean(),
  email: z.boolean(),
  recipients: z.array(rowSchema).max(30),
  title: z.string().trim().min(1, 'The title cannot be empty').max(150, 'The title is too long'),
  body: z.string().trim().max(1000, 'The message is too long'),
})

type Values = z.infer<typeof schema>

const valuesOf = (event: NotificationEvent): Values => ({
  isActive: event.isActive,
  inApp: event.inApp,
  email: event.email,
  title: event.wording.title,
  body: event.wording.body,
  recipients: event.recipients.map((line) => ({
    kind: line.kind,
    permissionPage: line.kind === 'TAB_ACCESS' ? line.permissionPage : '',
    departmentId: line.kind === 'DEPARTMENT' ? String(line.departmentId) : '',
    userId: line.kind === 'USER' ? String(line.userId) : '',
  })),
})

const lineOf = (row: Values['recipients'][number]): RecipientLine =>
  row.kind === 'CREATOR' ? { kind: 'CREATOR' } : row.kind === 'TAB_ACCESS' ? { kind: 'TAB_ACCESS', permissionPage: row.permissionPage } : row.kind === 'DEPARTMENT' ? { kind: 'DEPARTMENT', departmentId: Number(row.departmentId) } : { kind: 'USER', userId: Number(row.userId) }

const nameOf = (person: PersonRef) => person.name ?? person.email

interface EditorProps {
  event: NotificationEvent
  tabs: TabOption[]
  users: PersonRef[]
  departments: Array<{ id: number; name: string }>
  readOnly: boolean
  slots: Slots
}

const EventEditor: React.FC<EditorProps> = ({ event, tabs, users, departments, readOnly, slots }) => {
  const { success, failure } = useApiFeedback()
  const [save, { isLoading: saving }] = useSaveNotificationEventMutation()
  const { control, handleSubmit, watch, setValue, reset, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: valuesOf(event) })
  const titleBox = useRef<HTMLInputElement | null>(null)
  const bodyBox = useRef<HTMLTextAreaElement | null>(null)
  const lastFocus = useRef<'title' | 'body'>('title')
  const wording = { title: watch('title'), body: watch('body') }

  /** Drops a placeholder into the title or message, where the cursor was. */
  const insert = (token: string) => {
    const field = lastFocus.current
    const box = field === 'title' ? titleBox.current : bodyBox.current
    const text = `{${token}}`
    const current = wording[field]
    const from = box?.selectionStart ?? current.length
    const to = box?.selectionEnd ?? current.length
    setValue(field, current.slice(0, from) + text + current.slice(to), { shouldDirty: true, shouldValidate: formState.isSubmitted })
    requestAnimationFrame(() => {
      box?.focus()
      box?.setSelectionRange(from + text.length, from + text.length)
    })
  }
  const example = (text: string) => text.replace(/\{(\w+)\}/g, (match, token: string) => event.placeholders.find((placeholder) => placeholder.token === token)?.example ?? match)
  const differsFromDefault = wording.title !== event.defaultWording.title || wording.body !== event.defaultWording.body
  const { fields, append, remove } = useFieldArray({ control, name: 'recipients' })
  const rows = watch('recipients')
  const dirty = formState.isDirty

  const submit = handleSubmit(async (values) => {
    try {
      const saved = await save({ key: event.key, body: { isActive: values.isActive, inApp: values.inApp, email: values.email, recipients: values.recipients.map(lineOf), title: values.title, body: values.body } }).unwrap()
      reset(valuesOf(saved))
      success(`${event.label}: saved`)
    } catch (error) {
      failure(error, 'Could not save')
    }
  })

  const countOf = (index: number): string => {
    const saved = event.recipients[index]
    const row = rows[index]
    if (!saved || !row || saved.count === null || saved.kind !== row.kind) return ''
    const unchanged = (saved.kind === 'TAB_ACCESS' && saved.permissionPage === row.permissionPage) || (saved.kind === 'DEPARTMENT' && String(saved.departmentId) === row.departmentId) || (saved.kind === 'USER' && String(saved.userId) === row.userId)
    return unchanged ? `${saved.count} ${saved.count === 1 ? 'person' : 'people'} today` : ''
  }

  return (
    <form onSubmit={submit} noValidate>
      <FooterBar slot={slots.footer} status={dirty ? 'Unsaved changes' : 'All changes saved'}>
        <Btn disabled={!dirty || saving} onClick={() => reset(valuesOf(event))}>
          Discard
        </Btn>
        <Btn primary disabled={!dirty || saving || readOnly} onClick={() => void submit()}>
          {saving ? 'Saving…' : 'Save'}
        </Btn>
      </FooterBar>

      <PaneTitle
        title={event.label}
        right={<Controller control={control} name="isActive" render={({ field }) => <span className="flex items-center gap-2 text-[13px] text-slate-500">Active <OnOff on={field.value} onChange={field.onChange} disabled={readOnly || saving} /></span>} />}
      >
        {event.description}
      </PaneTitle>

      <SectionLabel>Tell these people</SectionLabel>
      {fields.map((field, index) => {
        const row = rows[index]
        if (!row) return null
        const errors = formState.errors.recipients?.[index]
        const problem = errors?.permissionPage?.message ?? errors?.departmentId?.message ?? errors?.userId?.message
        return (
          <div key={field.id} className="relative mb-3 rounded-lg border border-slate-200 bg-white p-4">
            {!readOnly && <RemoveBtn corner label="Remove recipient" onClick={() => remove(index)} />}
            <div className="flex items-center gap-3 pr-10">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center ds-circle bg-teal-700 text-[13px] font-bold leading-none text-white">{index + 1}</span>
              <Controller control={control} name={`recipients.${index}.kind`} render={({ field: kind }) => <Select options={KINDS as unknown as Array<{ value: Kind; label: string }>} value={kind.value} onChange={kind.onChange} searchable={false} disabled={readOnly || saving} width="w-52 shrink-0" />} />
              {row.kind === 'TAB_ACCESS' && (
                <Controller control={control} name={`recipients.${index}.permissionPage`} render={({ field: tab }) => <Select options={tabs.map((option) => ({ value: option.permissionPage, label: option.label }))} value={tab.value || undefined} onChange={tab.onChange} placeholder="Pick a tab…" searchable disabled={readOnly || saving} width="flex-1" />} />
              )}
              {row.kind === 'DEPARTMENT' && (
                <Controller control={control} name={`recipients.${index}.departmentId`} render={({ field: department }) => <Select options={departments.map((option) => ({ value: String(option.id), label: `${option.name} (heads)` }))} value={department.value || undefined} onChange={department.onChange} placeholder="Pick a department…" disabled={readOnly || saving} width="flex-1" />} />
              )}
              {row.kind === 'USER' && (
                <Controller control={control} name={`recipients.${index}.userId`} render={({ field: user }) => <Select options={users.map((option) => ({ value: String(option.id), label: nameOf(option) }))} value={user.value || undefined} onChange={user.onChange} placeholder="Pick a person…" searchable disabled={readOnly || saving} width="flex-1" />} />
              )}
            </div>
            {countOf(index) && <p className="mt-2 pl-10 text-[13px] text-slate-500">{countOf(index)}</p>}
            {problem && <p className="mt-2 text-xs text-red-600">{problem}</p>}
          </div>
        )
      })}
      {!readOnly && (
        <div className="mb-6 mt-1 flex flex-wrap items-center gap-3">
          <Btn disabled={saving} onClick={() => append({ kind: 'TAB_ACCESS' as Kind, permissionPage: '', departmentId: '', userId: '' })}>
            + Add recipient
          </Btn>
          <span className="text-xs text-slate-500">The creator · Everyone with access to a tab · A department · A person</span>
        </div>
      )}

      <div className="border-t border-slate-200 pt-5">
        <SectionLabel>Send by</SectionLabel>
        <div className="flex flex-wrap items-center gap-8">
          <Controller control={control} name="inApp" render={({ field }) => <label className="flex items-center gap-3 text-[13px] text-slate-800"><Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly || saving} aria-label="Bell icon" />Bell icon</label>} />
          <Controller control={control} name="email" render={({ field }) => <label className="flex items-center gap-3 text-[13px] text-slate-800"><Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly || saving} aria-label="Email" />Email</label>} />
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="mb-2 flex min-h-8 items-center justify-between">
          <SectionLabel>Wording</SectionLabel>
          {!readOnly && differsFromDefault && (
            <button type="button" onClick={() => { setValue('title', event.defaultWording.title, { shouldDirty: true }); setValue('body', event.defaultWording.body, { shouldDirty: true }) }} className="text-[13px] text-slate-500 underline hover:text-slate-800">
              Reset to default
            </button>
          )}
        </div>
        <label htmlFor="notification-title" className="mb-1 block text-xs text-slate-500">
          Title
        </label>
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <input id="notification-title" value={field.value} onChange={field.onChange} onBlur={field.onBlur} onFocus={() => { lastFocus.current = 'title' }} ref={(el) => { field.ref(el); titleBox.current = el }} disabled={readOnly || saving} maxLength={150} className={fieldClass(formState.errors.title?.message)} />
          )}
        />
        {formState.errors.title && <p className="mt-1 text-xs text-red-600">{formState.errors.title.message}</p>}
        <label htmlFor="notification-body" className="mb-1 mt-4 block text-xs text-slate-500">
          Message (optional)
        </label>
        <Controller
          control={control}
          name="body"
          render={({ field }) => (
            <textarea id="notification-body" rows={3} value={field.value} onChange={field.onChange} onBlur={field.onBlur} onFocus={() => { lastFocus.current = 'body' }} ref={(el) => { field.ref(el); bodyBox.current = el }} disabled={readOnly || saving} maxLength={1000} className={fieldClass(formState.errors.body?.message)} />
          )}
        />
        {formState.errors.body && <p className="mt-1 text-xs text-red-600">{formState.errors.body.message}</p>}

        {!readOnly && event.placeholders.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Insert:</span>
            {event.placeholders.map((placeholder) => (
              <button key={placeholder.token} type="button" title={`${placeholder.label}, e.g. ${placeholder.example}`} onClick={() => insert(placeholder.token)} className="h-8 border border-slate-300 bg-white px-2.5 text-[13px] text-slate-700 hover:bg-slate-50">
                {`{${placeholder.token}}`}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[13px]">
          <div className="mb-1 text-xs text-slate-500">What they receive (with an example):</div>
          <b>{example(wording.title) || '…'}</b>
          {wording.body.trim() && <div className="mt-0.5 whitespace-pre-line text-slate-600">{example(wording.body)}</div>}
        </div>
      </div>
    </form>
  )
}

const EventLoader: React.FC<{ eventKey: string; readOnly: boolean; slots: Slots }> = ({ eventKey, readOnly, slots }) => {
  const { data: event, isLoading, isError } = useGetNotificationEventQuery(eventKey)
  const { data: tabs = [] } = useGetNotificationTabsQuery()
  const { data: users = [] } = useGetApprovalUsersQuery()
  const { data: departments = [] } = useGetDepartmentsQuery()
  if (isLoading) return <Spinner />
  if (isError || !event) return <p className="text-sm text-red-600">Could not load this event.</p>
  return <EventEditor key={`${event.key}-${event.customised}-${JSON.stringify(event.recipients.map((line) => [line.kind, line.label]))}-${event.isActive}-${event.inApp}-${event.email}-${event.wording.title}-${event.wording.body}`} event={event} tabs={tabs} users={users} departments={departments} readOnly={readOnly} slots={slots} />
}

/** Notifications tab: for each thing that happens in the app, who is told, and how. */
export const NotificationsTab: React.FC<{ slots: Slots }> = ({ slots }) => {
  const canEdit = useAppAbility().can('write', 'settings:approvals')
  const { data: events = [], isLoading } = useGetNotificationEventsQuery()
  const [selected, setSelected] = useState<string | null>(null)
  if (isLoading) return <div className="p-6"><Spinner /></div>
  const key = selected ?? events[0]?.key
  // Same order as the design; a group the design does not know goes last
  const groups = [...new Set(events.map((event) => event.group))].sort((x, y) => (GROUP_ORDER.indexOf(x) + 1 || 99) - (GROUP_ORDER.indexOf(y) + 1 || 99))

  return (
    <TwoPane
      width={250}
      side={groups.map((group) => (
        <div key={group}>
          <SideTitle>{group}</SideTitle>
          {events
            .filter((event) => event.group === group)
            .map((event) => (
              <SideItem key={event.key} active={key === event.key} onClick={() => setSelected(event.key)}>
                <span>{event.label}</span>
              </SideItem>
            ))}
        </div>
      ))}
    >
      {key ? <EventLoader eventKey={key} readOnly={!canEdit} slots={slots} /> : <p className="text-sm text-slate-500">No events yet.</p>}
    </TwoPane>
  )
}
