'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useGetApprovalUsersQuery,
  useGetDepartmentsQuery,
  useGetNotificationEventQuery,
  useGetNotificationEventsQuery,
  useGetNotificationTabsQuery,
  useSaveNotificationEventMutation,
  usePreviewNotificationEmailMutation,
  type NotificationEmailPreview,
  type NotificationEvent,
  type PersonRef,
  type RecipientLine,
  type TabOption,
} from '@/services/api/approvals.api'
import { Switch } from '@/components/switch/Switch'
import type { Slots } from './ApprovalsScreen'
import { fieldClass } from '@/components/form-field/FormField'
import { AddPicker, Btn, Chip, FooterBar, Loading, OnOff, PaneTitle, SectionLabel, Select, SideItem, SideTitle, TwoPane } from './ui'
import { cn } from '@/utils/cn'

const GROUP_ORDER = ['Finance', 'Containers', 'Shipping', 'Procurement']

/** Events that exist on the server but are not offered here for now (they keep sending with their defaults). */
const HIDDEN_EVENTS: ReadonlySet<string> = new Set(['procurement.purchase-order.rejected'])

/** Who is told, grouped by kind: one multi-select each, so a screen, a department or a person never needs its own row. */
const recipientsSchema = z
  .object({ creator: z.boolean(), tabs: z.array(z.string()), departments: z.array(z.number()), users: z.array(z.number()) })
  .refine((who) => Number(who.creator) + who.tabs.length + who.departments.length + who.users.length <= 30, 'Too many recipients')

type Recipients = z.infer<typeof recipientsSchema>

const schema = z.object({
  isActive: z.boolean(),
  inApp: z.boolean(),
  email: z.boolean(),
  recipients: recipientsSchema,
  days: z.array(z.number().int()),
  title: z.string().trim().min(1, 'The title cannot be empty').max(150, 'The title is too long'),
  body: z.string().trim().max(1000, 'The message is too long'),
})

type Values = z.infer<typeof schema>

const recipientsOf = (lines: RecipientLine[]): Recipients => ({
  creator: lines.some((line) => line.kind === 'CREATOR'),
  tabs: lines.flatMap((line) => (line.kind === 'TAB_ACCESS' ? [line.permissionPage] : [])),
  departments: lines.flatMap((line) => (line.kind === 'DEPARTMENT' ? [line.departmentId] : [])),
  users: lines.flatMap((line) => (line.kind === 'USER' ? [line.userId] : [])),
})

/** What the server stores: one line per pick. */
const linesOf = (who: Recipients): RecipientLine[] => [
  ...(who.creator ? [{ kind: 'CREATOR' as const }] : []),
  ...who.tabs.map((permissionPage) => ({ kind: 'TAB_ACCESS' as const, permissionPage })),
  ...who.departments.map((departmentId) => ({ kind: 'DEPARTMENT' as const, departmentId })),
  ...who.users.map((userId) => ({ kind: 'USER' as const, userId })),
]

const valuesOf = (event: NotificationEvent): Values => ({
  isActive: event.isActive,
  inApp: event.inApp,
  email: event.email,
  title: event.wording.title,
  body: event.wording.body,
  recipients: recipientsOf(event.recipients),
  days: event.schedule?.days ?? [],
})

const nameOf = (person: PersonRef) => person.name ?? person.email

/** The email in a frame as tall as the email itself, so the pane's own scrollbar is the only one. */
const EmailFrame: React.FC<{ html: string }> = ({ html }) => {
  const frame = useRef<HTMLIFrameElement>(null)
  const fit = useCallback(() => {
    const box = frame.current
    const page = box?.contentDocument?.documentElement
    // The border is part of the frame's height, so it is added on top of the email's own
    if (box && page) box.style.height = `${page.scrollHeight + (box.offsetHeight - box.clientHeight)}px`
  }, [])
  useEffect(() => {
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [fit])
  // No scripts run in it; allowing the same origin only lets us read its height
  return <iframe ref={frame} title="Email preview" sandbox="allow-same-origin" scrolling="no" srcDoc={html} onLoad={fit} style={{ height: 600 }} className="block w-full rounded-lg border border-slate-200 bg-white" />
}

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
  const dirty = formState.isDirty

  // The email below the editor is the real template, rendered by the server for what is typed (a moment after typing stops)
  const [previewEmail] = usePreviewNotificationEmailMutation()
  const [mail, setMail] = useState<NotificationEmailPreview | null>(null)
  const [mailFailed, setMailFailed] = useState(false)
  const [previewAs, setPreviewAs] = useState<number | undefined>(undefined)
  const latestPreview = useRef(0)
  const picked = JSON.stringify(linesOf(watch('recipients')))
  useEffect(() => {
    const run = ++latestPreview.current
    const timer = setTimeout(() => {
      previewEmail({ key: event.key, title: wording.title, body: wording.body, recipients: JSON.parse(picked) as RecipientLine[], asUserId: previewAs })
        .unwrap()
        .then((result) => {
          if (run !== latestPreview.current) return
          setMail(result)
          setMailFailed(false)
        })
        .catch(() => run === latestPreview.current && setMailFailed(true))
    }, 350)
    return () => clearTimeout(timer)
  }, [event.key, wording.title, wording.body, picked, previewAs, previewEmail])

  const submit = handleSubmit(async (values) => {
    try {
      const saved = await save({ key: event.key, body: { isActive: values.isActive, inApp: values.inApp, email: values.email, recipients: linesOf(values.recipients), title: values.title, body: values.body, days: event.schedule ? values.days : undefined } }).unwrap()
      reset(valuesOf(saved))
      success(`${event.label}: saved`)
    } catch (error) {
      failure(error, 'Could not save')
    }
  })

  /** "9 people today" for a pick that is already saved. */
  const countOf = (kind: RecipientLine['kind'], same: (line: RecipientLine) => boolean): string => {
    const saved = event.recipients.find((line) => line.kind === kind && same(line))
    return saved && saved.count !== null ? ` · ${saved.count}` : ''
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
      <Controller
        control={control}
        name="recipients"
        render={({ field }) => {
          const who = field.value
          const set = (next: Partial<Recipients>) => field.onChange({ ...who, ...next })
          const off = readOnly || saving
          const group = (title: string, hint: string, children: React.ReactNode) => (
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-slate-800">
                {title} <span className="font-normal text-slate-500">{hint}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2">{children}</div>
            </div>
          )
          return (
            <div className="mb-6 flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-4">
              <label className="flex items-center gap-3 text-[13px] text-slate-800">
                <Switch checked={who.creator} onCheckedChange={(creator) => set({ creator })} disabled={off} aria-label="The creator" />
                The creator
              </label>
              {group('Everyone with access to', 'pick as many screens as you need', (
                <>
                  {!readOnly && (
                    <AddPicker
                      label="+ Add screens"
                      options={tabs.filter((tab) => !who.tabs.includes(tab.permissionPage)).map((tab) => ({ key: tab.permissionPage, label: tab.label }))}
                      onAdd={(picked) => set({ tabs: [...who.tabs, ...picked.map((option) => option.key)] })}
                      empty="Every screen is already picked."
                      disabled={off}
                      width="w-80"
                    />
                  )}
                  {who.tabs.map((page) => (
                    <Chip key={page} onRemove={off ? undefined : () => set({ tabs: who.tabs.filter((item) => item !== page) })}>
                      {(tabs.find((tab) => tab.permissionPage === page)?.label ?? page) + countOf('TAB_ACCESS', (line) => line.kind === 'TAB_ACCESS' && line.permissionPage === page)}
                    </Chip>
                  ))}
                </>
              ))}
              {group('Department heads', 'of these departments', (
                <>
                  {!readOnly && (
                    <AddPicker
                      label="+ Add departments"
                      options={departments.filter((department) => !who.departments.includes(department.id)).map((department) => ({ key: String(department.id), label: `${department.name} (heads)` }))}
                      onAdd={(picked) => set({ departments: [...who.departments, ...picked.map((option) => Number(option.key))] })}
                      empty="Every department is already picked."
                      disabled={off}
                      width="w-80"
                    />
                  )}
                  {who.departments.map((id) => (
                    <Chip key={id} onRemove={off ? undefined : () => set({ departments: who.departments.filter((item) => item !== id) })}>
                      {(departments.find((department) => department.id === id)?.name ?? 'Department') + countOf('DEPARTMENT', (line) => line.kind === 'DEPARTMENT' && line.departmentId === id)}
                    </Chip>
                  ))}
                </>
              ))}
              {group('People', 'named people', (
                <>
                  {!readOnly && (
                    <AddPicker
                      label="+ Add people"
                      options={users.filter((user) => !who.users.includes(user.id)).map((user) => ({ key: String(user.id), label: nameOf(user), hint: user.email }))}
                      onAdd={(picked) => set({ users: [...who.users, ...picked.map((option) => Number(option.key))] })}
                      empty="Everyone is already picked."
                      disabled={off}
                      width="w-80"
                    />
                  )}
                  {who.users.map((id) => {
                    const person = users.find((user) => user.id === id)
                    return (
                      <Chip key={id} onRemove={off ? undefined : () => set({ users: who.users.filter((item) => item !== id) })}>
                        {person ? nameOf(person) : 'A person'}
                      </Chip>
                    )
                  })}
                </>
              ))}
            </div>
          )
        }}
      />
      {formState.errors.recipients && <p className="-mt-4 mb-6 text-xs text-red-600">{formState.errors.recipients.message}</p>}

      {event.schedule && (
        <div className="mb-6 border-t border-slate-200 pt-5">
          <SectionLabel>{event.schedule.label}</SectionLabel>
          <Controller
            control={control}
            name="days"
            render={({ field }) => {
              const off = readOnly || saving
              const toggle = (day: number) => field.onChange(field.value.includes(day) ? field.value.filter((item) => item !== day) : [...field.value, day])
              const extra = event.schedule!.extra
              const chosen = [...field.value].filter((day) => day >= 0).sort((a, b) => a - b)
              const extraOn = Boolean(extra && field.value.includes(extra.value))
              return (
                <div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: event.schedule!.max + 1 }, (_, day) => {
                      const on = field.value.includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          disabled={off}
                          aria-pressed={on}
                          title={day === 0 ? 'On the ETA day' : `${day} ${day === 1 ? 'day' : 'days'} before the ETA`}
                          onClick={() => toggle(day)}
                          className={cn(
                            'flex h-11 min-w-[2.9rem] flex-col items-center justify-center rounded-lg border px-1 leading-none',
                            on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                            off && 'cursor-not-allowed opacity-60'
                          )}
                        >
                          <span className="text-[13px] font-semibold">{day === 0 ? 'ETA' : day}</span>
                          <span className={cn('mt-0.5 text-[9px]', on ? 'text-blue-100' : 'text-slate-400')}>{day === 0 ? 'day' : day === 1 ? 'day left' : 'days left'}</span>
                        </button>
                      )
                    })}
                  </div>
                  {extra && (
                    <button
                      type="button"
                      disabled={off}
                      aria-pressed={extraOn}
                      onClick={() => toggle(extra.value)}
                      className={cn(
                        'mt-2 flex items-center gap-3 rounded-lg border px-3 py-2 text-left',
                        extraOn ? 'border-blue-600 bg-blue-50' : 'border-slate-300 bg-white hover:bg-slate-50',
                        off && 'cursor-not-allowed opacity-60'
                      )}
                    >
                      <span className={cn('flex h-5 w-5 items-center justify-center rounded border text-xs font-bold', extraOn ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400 bg-white text-transparent')}>✓</span>
                      <span>
                        <span className="block text-[13px] font-semibold text-slate-800">{extra.label}</span>
                        <span className="block text-xs text-slate-500">{extra.hint}</span>
                      </span>
                    </button>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    {chosen.length === 0 && !extraOn
                      ? 'Nothing is ticked, so nothing is sent.'
                      : `Sent ${[...chosen.map((day) => (day === 0 ? 'on the ETA day' : `${day} ${day === 1 ? 'day' : 'days'} before`)), ...(extraOn ? ['every day while overdue'] : [])].join(', ')}.`}{' '}
                    {event.schedule!.note}
                  </p>
                </div>
              )
            }}
          />
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
          <SectionLabel>Template settings</SectionLabel>
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
          <div className="mb-1 text-xs text-slate-500">In the bell (with an example):</div>
          <b>{example(wording.title) || '…'}</b>
          {wording.body.trim() && <div className="mt-0.5 whitespace-pre-line text-slate-600">{example(wording.body)}</div>}
        </div>

        <div className="mt-6">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <SectionLabel>Email preview</SectionLabel>
            {mail && <span className="text-xs text-slate-500">Subject: {mail.subject || '(empty)'}</span>}
          </div>
          {mail && (
            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
              <p className="min-w-0 flex-1">
                {mail.usesYourName
                  ? 'Nobody is picked yet, so your name is shown. '
                  : `${mail.total} ${mail.total === 1 ? 'person receives' : 'people receive'} this. `}
                Each person gets it with their own name{mail.includesCreator ? ', and so does the creator of the record' : ''}. Shown for <b className="text-slate-700">{mail.shownFor.name}</b>.
              </p>
              {mail.people.length > 1 && (
                <span className="flex items-center gap-2">
                  Preview as
                  <Select<number> options={mail.people.map((person) => ({ value: person.id, label: person.name }))} value={mail.shownFor.id ?? undefined} onChange={setPreviewAs} searchable width="w-52" />
                </span>
              )}
            </div>
          )}
          {!watch('email') && <p className="mb-2 text-xs text-amber-700">Email is switched off for this event. This is what would be sent once you switch it on.</p>}
          <EmailFrame html={mail?.html ?? ''} />
          {mailFailed && <p className="mt-1 text-xs text-red-600">Could not refresh the preview. It shows the last one that loaded.</p>}
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
  if (isLoading) return <Loading />
  if (isError || !event) return <p className="text-sm text-red-600">Could not load this event.</p>
  return <EventEditor key={`${event.key}-${event.customised}-${JSON.stringify(event.recipients.map((line) => [line.kind, line.label]))}-${event.isActive}-${event.inApp}-${event.email}-${event.wording.title}-${event.wording.body}`} event={event} tabs={tabs} users={users} departments={departments} readOnly={readOnly} slots={slots} />
}

/** Notifications tab: for each thing that happens in the app, who is told, and how. */
export const NotificationsTab: React.FC<{ slots: Slots }> = ({ slots }) => {
  const canEdit = useAppAbility().can('write', 'settings:approvals')
  const { data: allEvents = [], isLoading } = useGetNotificationEventsQuery()
  const events = allEvents.filter((event) => !HIDDEN_EVENTS.has(event.key))
  const [selected, setSelected] = useState<string | null>(null)
  if (isLoading) return <Loading />
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
