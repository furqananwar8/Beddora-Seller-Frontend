'use client'

import React, { useMemo, useRef, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import type { Slots } from './ApprovalsScreen'
import { AddPicker, Btn, Chip, FooterBar, Loading, PaneTitle, RemoveBtn, Select, SideItem, SideTitle, Tag, TwoPane, type PickOption } from './ui'
import { cn } from '@/utils/cn'

// Same order as the design
const GROUP_ORDER = ['Procurement', 'Finance']
const ACTION_ORDER = ['procurement.po.submit', 'procurement.purchase-invoice.submit', 'procurement.price-analysis.approve', 'finance.payment-request.submit']
const rank = (list: string[], item: string) => (list.indexOf(item) + 1 || 99)

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
  steps: z.array(z.object({ uid: z.string(), completion: z.enum(['ANY', 'ALL', 'PER_GROUP']), assignees: z.array(assigneeSchema).min(1, 'Add at least one person to every step') })).max(10),
})

type Values = z.infer<typeof schema>

const nameOf = (person: PersonRef) => person.name ?? person.email
const same = (a: RuleAssignee, b: RuleAssignee) => a.kind === b.kind && (a.kind === 'USER' ? a.userId === (b as typeof a).userId : a.kind === 'DEPARTMENT' ? a.departmentId === (b as typeof a).departmentId : true)

const valuesOf = (rule: ApprovalRule): Values => ({
  isActive: rule.isActive,
  steps: rule.steps.map((step, index) => ({
    uid: `s${index}`,
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
  slots: Slots
}

const RuleEditor: React.FC<EditorProps> = ({ rule, lookups, readOnly, slots }) => {
  const { success, failure } = useApiFeedback()
  const [save, { isLoading: saving }] = useSaveApprovalRuleMutation()
  const { control, handleSubmit, watch, setValue, reset, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: valuesOf(rule) })
  const { fields, append, remove, move } = useFieldArray({ control, name: 'steps' })
  const steps = watch('steps')
  const dragFrom = useRef<number | null>(null)
  const dirty = formState.isDirty

  const setAssignees = (index: number, next: RuleAssignee[]) => setValue(`steps.${index}.assignees`, next, { shouldDirty: true, shouldValidate: formState.isSubmitted })
  const addMany = (index: number, added: RuleAssignee[]) => setAssignees(index, [...steps[index].assignees, ...added.filter((assignee) => !steps[index].assignees.some((existing) => same(existing, assignee)))])

  const submit = handleSubmit(async (values) => {
    try {
      const body = { isActive: true, steps: values.steps.map(({ completion, assignees }) => ({ completion, assignees })) }
      const saved = await save({ key: rule.key, body }).unwrap()
      reset(valuesOf(saved))
      success(`${rule.label}: rule saved`)
    } catch (error) {
      failure(error, 'Could not save the rule')
    }
  })

  /** Everything that can still join a step: people, departments (their heads) and, where it applies, the product platform. */
  const pickOptions = (index: number): Array<PickOption & { assignee: RuleAssignee }> => {
    const current = steps[index].assignees
    const taken = (candidate: RuleAssignee) => current.some((existing) => same(existing, candidate))
    return [
      ...(rule.supportsPlatform && !taken({ kind: 'PLATFORM' }) ? [{ key: 'platform', label: 'By product platform', hint: 'Retail / Ecommerce', assignee: { kind: 'PLATFORM' } as RuleAssignee }] : []),
      ...lookups.departments
        .filter((department) => !taken({ kind: 'DEPARTMENT', departmentId: department.id }))
        .map((department) => ({ key: `d${department.id}`, label: `${department.name} heads`, hint: headsOf(department).join(', ') || 'no head', assignee: { kind: 'DEPARTMENT', departmentId: department.id } as RuleAssignee })),
      ...lookups.users.filter((user) => !taken({ kind: 'USER', userId: user.id })).map((user) => ({ key: `u${user.id}`, label: nameOf(user), hint: 'Person', assignee: { kind: 'USER', userId: user.id } as RuleAssignee })),
    ]
  }

  return (
    <form onSubmit={submit} noValidate>
      <FooterBar slot={slots.footer} status={dirty ? 'Unsaved changes' : 'All changes saved'}>
        <Btn disabled={!dirty || saving} onClick={() => reset(valuesOf(rule))}>
          Discard
        </Btn>
        <Btn primary disabled={!dirty || saving || readOnly} onClick={() => void submit()}>
          {saving ? 'Saving…' : 'Save rule'}
        </Btn>
      </FooterBar>

      <PaneTitle title={rule.label}>
        Runs when the <b>{rule.buttonLabel}</b> button on {rule.where} is used.
      </PaneTitle>

      {fields.map((_, index) => {
        const step = steps[index]
        if (!step) return null
        const error = formState.errors.steps?.[index]?.assignees?.message
        return (
          // A key of our own: the form library renews its row ids when a step's people change, which remounted the whole card
          <div key={step.uid} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragFrom.current !== null && dragFrom.current !== index) move(dragFrom.current, index); dragFrom.current = null }}>
            <div className="relative rounded-lg border border-slate-200 bg-white p-4">
              {/* The last step stays: a rule always has someone to approve or reject */}
              {!readOnly && steps.length > 1 && <RemoveBtn corner label="Remove step" onClick={() => remove(index)} />}
              <div className="flex items-center gap-3 pr-10">
                <span draggable={!readOnly} onDragStart={() => { dragFrom.current = index }} title="Drag to reorder" className={cn('select-none text-slate-400', !readOnly && 'cursor-grab')}>
                  ⋮⋮
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center ds-circle bg-blue-600 text-[13px] font-bold leading-none text-white">{index + 1}</span>
                <span className="text-[13px] text-slate-600">Move on when</span>
                <Controller control={control} name={`steps.${index}.completion`} render={({ field: completion }) => <Select options={COMPLETIONS} value={completion.value} onChange={completion.onChange} searchable={false} disabled={readOnly || saving} width="w-52" />} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {!readOnly && <AddPicker label="+ Add person or department head" options={pickOptions(index)} onAdd={(picked) => addMany(index, picked.map((option) => option.assignee))} empty="Everyone is already in this step." width="w-80" />}
                {step.assignees.map((assignee, at) => (
                  <Chip key={`${assignee.kind}-${at}`} teal={assignee.kind === 'PLATFORM'} onRemove={readOnly ? undefined : () => setAssignees(index, step.assignees.filter((_, position) => position !== at))}>
                    {chipText(assignee, lookups)}
                  </Chip>
                ))}
              </div>
              {step.assignees.some((assignee) => assignee.kind === 'PLATFORM') && (
                <p className="mt-2 text-xs text-slate-500">Looks at the products on {rule.where}. Retail only: Retail team. Ecommerce only: Ecommerce team. Both: one from each.</p>
              )}
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            </div>
            <div className="my-2 ml-4 text-xs text-slate-400">↓ when approved</div>
          </div>
        )
      })}

      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-[13px]">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center ds-circle bg-green-600 text-xs font-bold text-white">✓</span>
        <b>{rule.outcome}</b>
        <span className="text-slate-500">(final outcome, fixed by the action)</span>
      </div>

      {!readOnly && (
        <div className="my-4 flex items-center gap-3">
          <Btn disabled={saving || fields.length >= 10} onClick={() => append({ uid: `n${Date.now()}`, completion: 'ANY', assignees: [] })}>
            + Add step
          </Btn>
          <span className="text-xs text-slate-500">Each step can hold several people</span>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3 border-t border-slate-200 pt-4 text-[13px] text-slate-500">
        If any step rejects: <span className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-slate-700">Return to creator, with reason</span> <span className="text-xs">(fixed in v1)</span>
      </div>
    </form>
  )
}

/** Loads one action's rule; the editor mounts only once the rule is here, so its form starts from it. */
const RuleLoader: React.FC<{ actionKey: string; lookups: Lookups; readOnly: boolean; slots: Slots }> = ({ actionKey, lookups, readOnly, slots }) => {
  const { data: rule, isLoading, isError } = useGetApprovalRuleQuery(actionKey)
  if (isLoading) return <Loading />
  if (isError || !rule) return <p className="text-sm text-red-600">Could not load this rule.</p>
  return <RuleEditor key={`${rule.key}-${JSON.stringify(rule.steps)}`} rule={rule} lookups={lookups} readOnly={readOnly} slots={slots} />
}

/** Approval rules tab: the actions on the left, the chain of the selected one on the right. */
export const RulesTab: React.FC<{ slots: Slots }> = ({ slots }) => {
  const canEdit = useAppAbility().can('write', 'settings:approvals')
  const { data: actions = [], isLoading } = useGetApprovalActionsQuery()
  const { data: users = [] } = useGetApprovalUsersQuery()
  const { data: departments = [] } = useGetDepartmentsQuery()
  const [selected, setSelected] = useState<string | null>(null)
  const lookups = useMemo(() => ({ users, departments }), [users, departments])

  if (isLoading) return <Loading />
  // The first rule in the design's order is open until another is picked
  const first = [...actions].filter((action) => action.available).sort((x, y) => rank(GROUP_ORDER, x.group) - rank(GROUP_ORDER, y.group) || rank(ACTION_ORDER, x.key) - rank(ACTION_ORDER, y.key))[0]
  const key = selected ?? first?.key
  const groups = [...new Set(actions.map((action) => action.group))].sort((x, y) => rank(GROUP_ORDER, x) - rank(GROUP_ORDER, y))

  return (
    <TwoPane
      width={250}
      side={
        <>
          {groups.map((group) => (
            <div key={group}>
              <SideTitle>{group}</SideTitle>
              {actions
                .filter((action) => action.group === group)
                .sort((x, y) => rank(ACTION_ORDER, x.key) - rank(ACTION_ORDER, y.key))
                .map((action) => (
                  <SideItem key={action.key} active={key === action.key} disabled={!action.available} onClick={() => setSelected(action.key)}>
                    <span className="min-w-0 flex-1">{action.label}</span>
                    {action.available ? <Tag tone={action.steps ? 'green' : 'slate'}>{action.steps ? `${action.steps} step${action.steps === 1 ? '' : 's'}` : 'none'}</Tag> : <Tag>soon</Tag>}
                  </SideItem>
                ))}
            </div>
          ))}
          <p className="mt-4 px-2 text-xs leading-snug text-slate-500">&quot;none&quot; = today&apos;s behavior: all holders of the page permission are notified.</p>
        </>
      }
    >
      {key ? <RuleLoader actionKey={key} lookups={lookups} readOnly={!canEdit} slots={slots} /> : <p className="text-sm text-slate-500">No approvable actions yet.</p>}
    </TwoPane>
  )
}
