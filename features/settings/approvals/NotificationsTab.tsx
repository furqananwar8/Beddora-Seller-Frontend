'use client'

import React, { useState } from 'react'
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
import { Btn, InHeader, OnOff, SideItem, SideTitle, TwoPane, selectClass } from './ui'
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

const schema = z.object({ isActive: z.boolean(), inApp: z.boolean(), email: z.boolean(), recipients: z.array(rowSchema).max(30) })

type Values = z.infer<typeof schema>

const valuesOf = (event: NotificationEvent): Values => ({
  isActive: event.isActive,
  inApp: event.inApp,
  email: event.email,
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
  slot: HTMLElement | null
}

const EventEditor: React.FC<EditorProps> = ({ event, tabs, users, departments, readOnly, slot }) => {
  const { success, failure } = useApiFeedback()
  const [save, { isLoading: saving }] = useSaveNotificationEventMutation()
  const { control, register, handleSubmit, watch, reset, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: valuesOf(event) })
  const { fields, append, remove } = useFieldArray({ control, name: 'recipients' })
  const rows = watch('recipients')
  const dirty = formState.isDirty
  const tabGroups = [...new Set(tabs.map((tab) => tab.group))]

  const submit = handleSubmit(async (values) => {
    try {
      const saved = await save({ key: event.key, body: { isActive: values.isActive, inApp: values.inApp, email: values.email, recipients: values.recipients.map(lineOf) } }).unwrap()
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
      <InHeader slot={slot}>
        <span className="mr-2 text-xs text-slate-500">{dirty ? 'Unsaved changes' : 'Saved'}</span>
        {dirty && (
          <Btn disabled={saving} onClick={() => reset(valuesOf(event))}>
            Discard
          </Btn>
        )}
        <Btn primary disabled={!dirty || saving || readOnly} onClick={() => void submit()}>
          {saving ? 'Saving…' : 'Save'}
        </Btn>
      </InHeader>

      <div className="mb-0.5 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-slate-900">{event.label}</h2>
        <Controller control={control} name="isActive" render={({ field }) => <span className="flex items-center gap-1.5 text-xs text-slate-500">Active <OnOff on={field.value} onChange={field.onChange} disabled={readOnly || saving} /></span>} />
      </div>
      <p className="mb-3 text-xs text-slate-500">{event.description}</p>

      <div className="mb-1.5 text-[13px] font-semibold text-slate-900">Tell these people</div>
      {fields.map((field, index) => {
        const row = rows[index]
        if (!row) return null
        const errors = formState.errors.recipients?.[index]
        return (
          <div key={field.id} className="mb-1.5 rounded-lg border border-slate-200 bg-white p-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-700 text-[10px] font-bold text-white">{index + 1}</span>
              <select {...register(`recipients.${index}.kind`)} disabled={readOnly || saving} className={cn(selectClass, 'min-w-[170px]')}>
                {KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
              {row.kind === 'TAB_ACCESS' && (
                <select {...register(`recipients.${index}.permissionPage`)} disabled={readOnly || saving} className={cn(selectClass, 'min-w-[200px]')}>
                  <option value="">Pick a tab…</option>
                  {tabGroups.map((group) => (
                    <optgroup key={group} label={group}>
                      {tabs.filter((tab) => tab.group === group).map((tab) => (
                        <option key={tab.permissionPage} value={tab.permissionPage}>
                          {tab.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
              {row.kind === 'DEPARTMENT' && (
                <select {...register(`recipients.${index}.departmentId`)} disabled={readOnly || saving} className={cn(selectClass, 'min-w-[200px]')}>
                  <option value="">Pick a department…</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} (heads)
                    </option>
                  ))}
                </select>
              )}
              {row.kind === 'USER' && (
                <select {...register(`recipients.${index}.userId`)} disabled={readOnly || saving} className={cn(selectClass, 'min-w-[200px]')}>
                  <option value="">Pick a person…</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {nameOf(user)}
                    </option>
                  ))}
                </select>
              )}
              <span className="text-xs text-slate-500">{countOf(index)}</span>
              {!readOnly && (
                <button type="button" onClick={() => remove(index)} className="ml-auto text-xs text-slate-500 hover:text-red-600">
                  Remove
                </button>
              )}
            </div>
            {(errors?.permissionPage?.message || errors?.departmentId?.message || errors?.userId?.message) && <p className="mt-1 pl-7 text-xs text-red-600">{errors?.permissionPage?.message ?? errors?.departmentId?.message ?? errors?.userId?.message}</p>}
          </div>
        )
      })}
      {!readOnly && (
        <div className="my-2 flex items-center gap-2">
          <Btn disabled={saving} onClick={() => append({ kind: 'TAB_ACCESS' as Kind, permissionPage: '', departmentId: '', userId: '' })}>
            + Add recipient
          </Btn>
          <span className="text-xs text-slate-500">The creator · Everyone with access to a tab · A department · A person</span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-5 border-t border-slate-200 pt-2 text-[13px]">
        <b>Send by</b>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" {...register('inApp')} disabled={readOnly || saving} /> Bell icon
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" {...register('email')} disabled={readOnly || saving} /> Email
        </label>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
        <span className="text-slate-500">What they receive (wording is fixed in code):</span>
        <br />
        <b>{event.preview.title}</b>
        {event.preview.body && <> · {event.preview.body.replace(/\n/g, ' · ')}</>}
      </div>
    </form>
  )
}

const EventLoader: React.FC<{ eventKey: string; readOnly: boolean; slot: HTMLElement | null }> = ({ eventKey, readOnly, slot }) => {
  const { data: event, isLoading, isError } = useGetNotificationEventQuery(eventKey)
  const { data: tabs = [] } = useGetNotificationTabsQuery()
  const { data: users = [] } = useGetApprovalUsersQuery()
  const { data: departments = [] } = useGetDepartmentsQuery()
  if (isLoading) return <Spinner />
  if (isError || !event) return <p className="text-sm text-red-600">Could not load this event.</p>
  return <EventEditor key={`${event.key}-${event.customised}-${JSON.stringify(event.recipients.map((line) => [line.kind, line.label]))}-${event.isActive}-${event.inApp}-${event.email}`} event={event} tabs={tabs} users={users} departments={departments} readOnly={readOnly} slot={slot} />
}

/** Notifications tab: for each thing that happens in the app, who is told, and how. */
export const NotificationsTab: React.FC<{ slot: HTMLElement | null }> = ({ slot }) => {
  const canEdit = useAppAbility().can('write', 'settings:approvals')
  const { data: events = [], isLoading } = useGetNotificationEventsQuery()
  const [selected, setSelected] = useState<string | null>(null)
  if (isLoading) return <div className="p-6"><Spinner /></div>
  const key = selected ?? events[0]?.key
  // Same order as the design; a group the design does not know goes last
  const groups = [...new Set(events.map((event) => event.group))].sort((x, y) => (GROUP_ORDER.indexOf(x) + 1 || 99) - (GROUP_ORDER.indexOf(y) + 1 || 99))

  return (
    <TwoPane
      width={200}
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
      {key ? <EventLoader eventKey={key} readOnly={!canEdit} slot={slot} /> : <p className="text-sm text-slate-500">No events yet.</p>}
    </TwoPane>
  )
}
