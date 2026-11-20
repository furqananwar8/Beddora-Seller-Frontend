'use client'

import React, { useMemo, useRef, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useGetApprovalActionsQuery,
  useGetApprovalRuleQuery,
  useGetApprovalUsersQuery,
  useGetDepartmentsQuery,
  useSaveApprovalRuleMutation,
  type ApprovalRule,
  type Completion,
  type Department,
  type PersonRef,
  type RuleAssignee,
} from '@/services/api/approvals.api'
import { AddPicker, Btn, Chip, InHeader, OnOff, SideItem, SideTitle, Tag, TwoPane, selectClass, type PickOption } from './ui'
import { cn } from '@/utils/cn'

const COMPLETIONS: Array<{ value: Completion; label: string }> = [
  { value: 'ANY', label: 'Any one approves' },
  { value: 'ALL', label: 'Everyone approves' },
  { value: 'PER_GROUP', label: 'One from each team' },
]

const assigneeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('USER'), userId: z.number() }),
  z.object({ kind: z.literal('DEPARTMENT'), departmentId: z.number() }),
  z.object({ kind: z.literal('PLATFORM') }),
])

const schema = z.object({
  isActive: z.boolean(),
  steps: z.array(z.object({ completion: z.enum(['ANY', 'ALL', 'PER_GROUP']), assignees: z.array(assigneeSchema).min(1, 'Add at least one person to every step') })).max(10),
})

type Values = z.infer<typeof schema>

const nameOf = (person: PersonRef) => person.name ?? person.email
const same = (a: RuleAssignee, b: RuleAssignee) => a.kind === b.kind && (a.kind === 'USER' ? a.userId === (b as typeof a).userId : a.kind === 'DEPARTMENT' ? a.departmentId === (b as typeof a).departmentId : true)

const valuesOf = (rule: ApprovalRule): Values => ({
  isActive: rule.isActive,
  steps: rule.steps.map((step) => ({
    completion: step.completion,
    assignees: step.assignees.map((a): RuleAssignee => (a.kind === 'USER' ? { kind: 'USER', userId: a.userId } : a.kind === 'DEPARTMENT' ? { kind: 'DEPARTMENT', departmentId: a.departmentId } : { kind: 'PLATFORM' })),
  })),
})

interface Lookups {
  users: PersonRef[]
  departments: Department[]
}

const headsOf = (department: Department) => department.members.filter((member) => member.isHead).map(nameOf)

/** What a chip shows today: the person, or the department with the heads it goes to right now. */
function chipText(assignee: RuleAssignee, { users, departments }: Lookups): React.ReactNode {
  if (assignee.kind === 'USER') return nameOf(users.find((user) => user.id === assignee.userId) ?? { id: 0, name: 'Unknown person', email: '' })
  if (assignee.kind === 'DEPARTMENT') {
    const department = departments.find((candidate) => candidate.id === assignee.departmentId)
    if (!department) return 'Unknown department'
    const heads = headsOf(department)
    return (
      <>
        {department.name} heads · <b>{heads.length ? heads.join(', ') : 'none set'}</b>
      </>
    )
  }
  return 'By product platform'
}

interface EditorProps {
  rule: ApprovalRule
  lookups: Lookups
  readOnly: boolean
  slot: HTMLElement | null
}

const RuleEditor: React.FC<EditorProps> = ({ rule, lookups, readOnly, slot }) => {
  const { success, failure } = useApiFeedback()
  const [save, { isLoading: saving }] = useSaveApprovalRuleMutation()
  const { control, register, handleSubmit, watch, setValue, reset, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: valuesOf(rule) })
  const { fields, append, remove, move } = useFieldArray({ control, name: 'steps' })
  const steps = watch('steps')
  const dragFrom = useRef<number | null>(null)
  const dirty = formState.isDirty

  const setAssignees = (index: number, next: RuleAssignee[]) => setValue(`steps.${index}.assignees`, next, { shouldDirty: true, shouldValidate: formState.isSubmitted })
  const add = (index: number, assignee: RuleAssignee) => !steps[index].assignees.some((existing) => same(existing, assignee)) && setAssignees(index, [...steps[index].assignees, assignee])

  const submit = handleSubmit(async (values) => {
    try {
      const saved = await save({ key: rule.key, body: values }).unwrap()
      reset(valuesOf(saved))
      success(values.steps.length === 0 ? `${rule.label}: rule removed, it works as before` : `${rule.label}: rule saved`)
    } catch (error) {
      failure(error, 'Could not save the rule')
    }
  })

  const pickOptions = (index: number): Array<{ title?: string; options: PickOption[] }> => {
    const current = steps[index].assignees
    const taken = (candidate: RuleAssignee) => current.some((existing) => same(existing, candidate))
    return [
      {
        title: 'People',
        options: lookups.users.filter((user) => !taken({ kind: 'USER', userId: user.id })).map((user) => ({ key: `u${user.id}`, label: nameOf(user), onPick: () => add(index, { kind: 'USER', userId: user.id }) })),
      },
      {
        title: 'Department heads',
        options: lookups.departments
          .filter((department) => !taken({ kind: 'DEPARTMENT', departmentId: department.id }))
          .map((department) => ({ key: `d${department.id}`, label: department.name, hint: headsOf(department).join(', ') || 'no head', onPick: () => add(index, { kind: 'DEPARTMENT', departmentId: department.id }) })),
      },
      ...(rule.supportsPlatform && !taken({ kind: 'PLATFORM' }) ? [{ title: 'Product platform', options: [{ key: 'platform', label: 'By product platform', hint: 'Retail / Ecommerce', onPick: () => add(index, { kind: 'PLATFORM' }) }] }] : []),
    ]
  }

  return (
    <form onSubmit={submit} noValidate>
      <InHeader slot={slot}>
        {dirty && <span className="mr-2 text-xs text-slate-500">Unsaved changes</span>}
        <Btn disabled={!dirty || saving} onClick={() => reset(valuesOf(rule))}>
          Discard
        </Btn>
        <Btn primary disabled={!dirty || saving || readOnly} onClick={() => void submit()}>
          {saving ? 'Saving…' : 'Save rule'}
        </Btn>
      </InHeader>

      <div className="mb-0.5 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-slate-900">{rule.label}</h2>
        <Controller control={control} name="isActive" render={({ field }) => <span className="flex items-center gap-1.5 text-xs text-slate-500">Active <OnOff on={field.value} onChange={field.onChange} disabled={readOnly || saving} /></span>} />
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Runs when the <b>{rule.buttonLabel}</b> button on {rule.where} is used.
      </p>

      {fields.map((field, index) => {
        const step = steps[index]
        if (!step) return null
        const error = formState.errors.steps?.[index]?.assignees?.message
        return (
          <div key={field.id} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragFrom.current !== null && dragFrom.current !== index) move(dragFrom.current, index); dragFrom.current = null }}>
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2">
              <span draggable={!readOnly} onDragStart={() => { dragFrom.current = index }} title="Drag to reorder" className={cn('mt-1 select-none text-slate-400', !readOnly && 'cursor-grab')}>
                ⋮⋮
              </span>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Move on when</span>
                  <select {...register(`steps.${index}.completion`)} disabled={readOnly || saving} className={cn(selectClass, 'ml-auto min-w-[170px]')}>
                    {COMPLETIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {!readOnly && (
                    <button type="button" onClick={() => remove(index)} className="text-xs text-slate-500 hover:text-red-600">
                      Remove step
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {step.assignees.map((assignee, at) => (
                    <Chip key={`${assignee.kind}-${at}`} teal={assignee.kind === 'PLATFORM'} onRemove={readOnly ? undefined : () => setAssignees(index, step.assignees.filter((_, position) => position !== at))}>
                      {chipText(assignee, lookups)}
                    </Chip>
                  ))}
                  {!readOnly && <AddPicker label="+ Add person or department head" groups={pickOptions(index)} empty="Everyone is already in this step." />}
                </div>
                {step.assignees.some((assignee) => assignee.kind === 'PLATFORM') && (
                  <p className="mt-1 text-[11px] text-slate-500">Looks at the products on {rule.where}. Retail only: Retail team. Ecommerce only: Ecommerce team. Both: one from each.</p>
                )}
                {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
              </div>
            </div>
            <div className="my-1 ml-[17px] text-[10px] text-slate-400">↓ when approved</div>
          </div>
        )
      })}

      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[13px]">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">✓</span>
        <b>{rule.outcome}</b>
        <span className="text-slate-500">(final outcome, fixed by the action)</span>
      </div>

      {!readOnly && (
        <div className="my-2 flex items-center gap-2">
          <Btn disabled={saving || fields.length >= 10} onClick={() => append({ completion: 'ANY', assignees: [] })}>
            + Add step
          </Btn>
          <span className="text-xs text-slate-500">Each step can hold several people</span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-2 text-xs text-slate-500">
        If any step rejects: <span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700">Return to creator, with reason</span> (fixed in v1)
      </div>
    </form>
  )
}

/** Loads one action's rule; the editor mounts only once the rule is here, so its form starts from it. */
const RuleLoader: React.FC<{ actionKey: string; lookups: Lookups; readOnly: boolean; slot: HTMLElement | null }> = ({ actionKey, lookups, readOnly, slot }) => {
  const { data: rule, isLoading, isError } = useGetApprovalRuleQuery(actionKey)
  if (isLoading) return <Spinner />
  if (isError || !rule) return <p className="text-sm text-red-600">Could not load this rule.</p>
  return <RuleEditor key={`${rule.key}-${JSON.stringify(rule.steps)}`} rule={rule} lookups={lookups} readOnly={readOnly} slot={slot} />
}

/** Approval rules tab: the actions on the left, the chain of the selected one on the right. */
export const RulesTab: React.FC<{ slot: HTMLElement | null }> = ({ slot }) => {
  const canEdit = useAppAbility().can('write', 'settings:approvals')
  const { data: actions = [], isLoading } = useGetApprovalActionsQuery()
  const { data: users = [] } = useGetApprovalUsersQuery()
  const { data: departments = [] } = useGetDepartmentsQuery()
  const [selected, setSelected] = useState<string | null>(null)
  const lookups = useMemo(() => ({ users, departments }), [users, departments])

  if (isLoading) return <div className="p-6"><Spinner /></div>
  const key = selected ?? actions.find((action) => action.available)?.key
  const groups = [...new Set(actions.map((action) => action.group))]

  return (
    <TwoPane
      width={200}
      side={
        <>
          {groups.map((group) => (
            <div key={group}>
              <SideTitle>{group}</SideTitle>
              {actions
                .filter((action) => action.group === group)
                .map((action) => (
                  <SideItem key={action.key} active={key === action.key} disabled={!action.available} onClick={() => setSelected(action.key)}>
                    <span>{action.label}</span>
                    {action.available ? <Tag tone={action.steps ? 'green' : 'slate'}>{action.steps ? `${action.steps} step${action.steps === 1 ? '' : 's'}` : 'none'}</Tag> : <Tag>soon</Tag>}
                  </SideItem>
                ))}
            </div>
          ))}
          <p className="mt-3 text-[10px] leading-snug text-slate-500">&quot;none&quot; = today&apos;s behavior: all holders of the page permission are notified.</p>
        </>
      }
    >
      {key ? <RuleLoader actionKey={key} lookups={lookups} readOnly={!canEdit} slot={slot} /> : <p className="text-sm text-slate-500">No approvable actions yet.</p>}
    </TwoPane>
  )
}
