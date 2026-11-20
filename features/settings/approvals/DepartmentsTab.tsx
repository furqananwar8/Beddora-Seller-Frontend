'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useCreateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetApprovalUsersQuery,
  useGetDepartmentsQuery,
  useUpdateDepartmentMutation,
  type Department,
  type DepartmentBody,
  type PersonRef,
  type Platform,
} from '@/services/api/approvals.api'
import type { Slots } from './ApprovalsScreen'
import { AddPicker, Avatar, Btn, Chip, FooterBar, InHeader, Loading, PaneTitle, RemoveBtn, SectionLabel, Select, SideItem, Tag, TwoPane, XIcon } from './ui'

const nameOf = (person: PersonRef) => person.name ?? person.email
const byName = (a: PersonRef, b: PersonRef) => nameOf(a).localeCompare(nameOf(b), undefined, { sensitivity: 'base' })

const PLATFORM_OPTIONS: Array<{ value: Platform | null; label: string }> = [
  { value: null, label: '— none —' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'ECOMMERCE', label: 'Ecommerce' },
]

const bodyOf = (department: Department): DepartmentBody => ({ name: department.name, platform: department.platform, members: department.members.map((member) => ({ userId: member.id, isHead: member.isHead })) })

const nameSchema = z.object({ name: z.string().trim().min(1, 'Name is required').max(80, 'Name is too long') })

/** A name box in a modal: "+ New department" and "Rename" both use it. */
const NameModal: React.FC<{ title: string; initial: string; busy: boolean; onSubmit: (name: string) => Promise<void>; onClose: () => void }> = ({ title, initial, busy, onSubmit, onClose }) => {
  const { register, handleSubmit, formState } = useForm<{ name: string }>({ resolver: zodResolver(nameSchema), defaultValues: { name: initial } })
  return (
    <Modal isOpen onClose={busy ? () => undefined : onClose} title={title} size="sm">
      <form onSubmit={handleSubmit((values) => onSubmit(values.name.trim()))} noValidate className="space-y-4">
        <FormField label="Name" htmlFor="department-name" required error={formState.errors.name?.message}>
          <input id="department-name" autoFocus {...register('name')} disabled={busy} placeholder="Procurement" className={fieldClass(formState.errors.name?.message)} />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" isLoading={busy}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

interface EditorProps {
  department: Department
  users: PersonRef[]
  readOnly: boolean
  onDeleted: () => void
}

/** One department. Heads, platform and members save as you change them, like the design (no Save button here). */
const DepartmentEditor: React.FC<EditorProps> = ({ department, users, readOnly, onDeleted }) => {
  const { success, failure } = useApiFeedback()
  const [update, { isLoading: saving }] = useUpdateDepartmentMutation()
  const [remove, { isLoading: removing }] = useDeleteDepartmentMutation()
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const change = async (next: Partial<DepartmentBody>, message?: string) => {
    try {
      await update({ id: department.id, body: { ...bodyOf(department), ...next } }).unwrap()
      if (message) success(message)
    } catch (error) {
      failure(error, 'Could not save the department')
    }
  }
  const members = bodyOf(department).members
  const setHead = (userId: number, isHead: boolean) =>
    change({ members: members.some((member) => member.userId === userId) ? members.map((member) => (member.userId === userId ? { ...member, isHead } : member)) : [...members, { userId, isHead }] })
  // A fixed order (by name), so adding or removing someone never moves the rows around
  const sorted = [...department.members].sort(byName)
  const heads = sorted.filter((member) => member.isHead)
  /** Several people join in one save. */
  const addMembers = (userIds: number[]) => change({ members: [...members, ...userIds.filter((id) => !members.some((member) => member.userId === id)).map((userId) => ({ userId, isHead: false }))] })
  /** Several people become heads in one save (a member is marked, anyone else joins as a head). */
  const addHeads = (userIds: number[]) =>
    change({ members: [...members.map((member) => (userIds.includes(member.userId) ? { ...member, isHead: true } : member)), ...userIds.filter((id) => !members.some((member) => member.userId === id)).map((userId) => ({ userId, isHead: true }))] })
  const memberIds = new Set(department.members.map((member) => member.id))
  const candidates = users.filter((user) => !memberIds.has(user.id))

  return (
    <div>
      <PaneTitle
        title={department.name}
        right={
          !readOnly && (
            <span className="flex items-center gap-2">
              <Btn onClick={() => setRenaming(true)}>Rename</Btn>
              <Btn aria-label="Delete department" title="Delete department" className="w-9 px-0 text-slate-500 hover:text-red-600" onClick={() => setDeleting(true)}>
                <XIcon />
              </Btn>
            </span>
          )
        }
      >
        {department.members.length} {department.members.length === 1 ? 'member' : 'members'}
      </PaneTitle>

      <div className="mb-6">
        <SectionLabel>Heads (one or more)</SectionLabel>
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <AddPicker
              label="+ Add head"
              empty="Nobody left to add."
              options={[
                ...sorted.filter((member) => !member.isHead).map((member) => ({ key: String(member.id), label: nameOf(member), hint: 'Member' })),
                ...[...candidates].sort(byName).map((user) => ({ key: String(user.id), label: nameOf(user), hint: 'Other' })),
              ]}
              onAdd={(picked) => void addHeads(picked.map((option) => Number(option.key)))}
              width="w-56"
            />
          )}
          {heads.map((head) => (
            <Chip key={head.id} onRemove={readOnly ? undefined : () => void setHead(head.id, false)}>
              {nameOf(head)}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {heads.length === 0 ? <span className="text-red-600">No head yet: rules using this department cannot be saved.</span> : `Approval steps that use "${department.name}" go to all of these people, by bell and email.`}
        </p>
      </div>

      <div className="mb-6">
        <SectionLabel>Approves products on platform</SectionLabel>
        <Select<Platform | null> options={PLATFORM_OPTIONS} value={department.platform} onChange={(platform) => void change({ platform })} searchable={false} disabled={readOnly} width="w-60" />
        <p className="mt-2 text-xs text-slate-500">Set to Retail or Ecommerce on the teams that approve those products.</p>
      </div>

      <SectionLabel>Members</SectionLabel>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-slate-100 text-left text-xs font-semibold text-slate-600">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="w-14 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {department.members.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-slate-500">
                  No members yet.
                </td>
              </tr>
            )}
            {sorted.map((member) => (
              <tr key={member.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <span className="flex items-center gap-2">
                    <Avatar />
                    {nameOf(member)} {member.isHead && <Tag tone="indigo">Head</Tag>}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500">{member.email}</td>
                <td className="px-2 py-1 text-right">{!member.isHead && !readOnly && <RemoveBtn label={`Remove ${nameOf(member)}`} onClick={() => void change({ members: members.filter((candidate) => candidate.userId !== member.id) })} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="mt-3">
          <AddPicker
            label="Add members… (search users)"
            empty="Everyone is already a member."
            options={[...candidates].sort(byName).map((user) => ({ key: String(user.id), label: nameOf(user), hint: user.email }))}
            onAdd={(picked) => void addMembers(picked.map((option) => Number(option.key)))}
            width="w-80"
          />
        </div>
      )}

      {renaming && (
        <NameModal
          title="Rename department"
          initial={department.name}
          busy={saving}
          onClose={() => setRenaming(false)}
          onSubmit={async (name) => {
            await change({ name }, `Renamed to ${name}`)
            setRenaming(false)
          }}
        />
      )}
      <ConfirmDialog
        isOpen={deleting}
        title="Delete this department?"
        confirmLabel="Delete"
        tone="danger"
        busy={removing}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          try {
            await remove(department.id).unwrap()
            success(`${department.name} deleted`)
            setDeleting(false)
            onDeleted()
          } catch (error) {
            setDeleting(false)
            failure(error, 'Could not delete the department')
          }
        }}
      >
        {department.name} will be removed. A department used by an approval rule cannot be deleted.
      </ConfirmDialog>
    </div>
  )
}

/** Departments tab: who sits where, and who heads each team. */
export const DepartmentsTab: React.FC<{ slots: Slots }> = ({ slots }) => {
  const canEdit = useAppAbility().can('write', 'settings:approvals')
  const { success, failure } = useApiFeedback()
  const { data: departments = [], isLoading } = useGetDepartmentsQuery()
  const { data: users = [] } = useGetApprovalUsersQuery()
  const [create, { isLoading: creating }] = useCreateDepartmentMutation()
  const [selected, setSelected] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (selected !== null && !departments.some((department) => department.id === selected)) setSelected(null)
  }, [departments, selected])

  const current = departments.find((department) => department.id === (selected ?? departments[0]?.id)) ?? null

  if (isLoading) return <Loading />

  return (
    <>
      <InHeader slot={slots.header}>{canEdit && <Btn primary onClick={() => setAdding(true)}>+ New department</Btn>}</InHeader>
      <FooterBar slot={slots.footer} status={canEdit ? 'Changes on this tab save as you make them' : 'You can view departments but not change them'} />
      <TwoPane
        width={220}
        side={departments.map((department) => (
          <SideItem key={department.id} active={current?.id === department.id} onClick={() => setSelected(department.id)}>
            <span className="truncate">{department.name}</span>
            <span className="text-xs text-slate-500">{department.members.length}</span>
          </SideItem>
        ))}
      >
        {current ? <DepartmentEditor key={current.id} department={current} users={users} readOnly={!canEdit} onDeleted={() => setSelected(null)} /> : <p className="text-sm text-slate-500">No departments yet.{canEdit ? ' Use “+ New department” above.' : ''}</p>}
      </TwoPane>
      {adding && (
        <NameModal
          title="New department"
          initial=""
          busy={creating}
          onClose={() => setAdding(false)}
          onSubmit={async (name) => {
            try {
              const created = await create({ name, platform: null, members: [] }).unwrap()
              success(`${created.name} created. Add its heads and members.`)
              setSelected(created.id)
              setAdding(false)
            } catch (error) {
              failure(error, 'Could not create the department')
            }
          }}
        />
      )}
    </>
  )
}
