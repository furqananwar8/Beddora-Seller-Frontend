'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
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
import { AddPicker, Avatar, Btn, Chip, InHeader, SideItem, Tag, TwoPane, selectClass } from './ui'

const nameOf = (person: PersonRef) => person.name ?? person.email

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
  const [newMember, setNewMember] = useState('')

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
  const heads = department.members.filter((member) => member.isHead)
  const memberIds = new Set(department.members.map((member) => member.id))
  const candidates = users.filter((user) => !memberIds.has(user.id))
  const toAdd = users.find((user) => String(user.id) === newMember)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-slate-900">{department.name}</h2>
        {!readOnly && (
          <span className="flex items-center gap-2">
            <button type="button" onClick={() => setDeleting(true)} className="text-xs text-slate-500 hover:text-red-600">
              Delete
            </button>
            <Btn onClick={() => setRenaming(true)}>Rename</Btn>
          </span>
        )}
      </div>

      <div className="mb-3">
        <div className="text-xs text-slate-500">Heads (one or more)</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {heads.map((head) => (
            <Chip key={head.id} onRemove={readOnly || saving ? undefined : () => void setHead(head.id, false)}>
              {nameOf(head)}
            </Chip>
          ))}
          {!readOnly && (
            <AddPicker
              label="+ Add head"
              empty="Nobody left to add."
              groups={[
                { title: 'Members', options: department.members.filter((member) => !member.isHead).map((member) => ({ key: `m${member.id}`, label: nameOf(member), onPick: () => void setHead(member.id, true) })) },
                { title: 'Other people', options: candidates.map((user) => ({ key: `u${user.id}`, label: nameOf(user), onPick: () => void setHead(user.id, true) })) },
              ]}
            />
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {heads.length === 0 ? <span className="text-red-600">No head yet: rules using this department cannot be saved.</span> : `Approval steps that use "${department.name}" go to all of these people, by bell and email.`}
        </p>
      </div>

      <div className="mb-3">
        <div className="text-xs text-slate-500">Approves products on platform</div>
        <select
          value={department.platform ?? ''}
          disabled={readOnly || saving}
          onChange={(event) => void change({ platform: (event.target.value || null) as Platform | null })}
          className={`${selectClass} mt-1 min-w-[200px]`}
        >
          <option value="">— none —</option>
          <option value="RETAIL">Retail</option>
          <option value="ECOMMERCE">Ecommerce</option>
        </select>
        <p className="mt-1 text-xs text-slate-500">Set to Retail or Ecommerce on the teams that approve those products.</p>
      </div>

      <div className="mb-1 text-xs text-slate-500">Members</div>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-slate-100 text-left text-xs font-semibold text-slate-600">
              <th className="px-3 py-1.5">Name</th>
              <th className="px-3 py-1.5">Email</th>
              <th className="w-20 px-3 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {department.members.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-3 text-slate-500">
                  No members yet.
                </td>
              </tr>
            )}
            {department.members.map((member) => (
              <tr key={member.id} className="border-t border-slate-100">
                <td className="px-3 py-1.5">
                  <Avatar />
                  {nameOf(member)} {member.isHead && <Tag tone="indigo">Head</Tag>}
                </td>
                <td className="px-3 py-1.5 text-slate-500">{member.email}</td>
                <td className="px-3 py-1.5 text-right text-xs text-slate-500">
                  {!member.isHead && !readOnly && (
                    <button type="button" disabled={saving} onClick={() => void change({ members: members.filter((candidate) => candidate.userId !== member.id) })} className="hover:text-red-600">
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="mt-2 flex items-center gap-2">
          <select value={newMember} onChange={(event) => setNewMember(event.target.value)} className={`${selectClass} min-w-[220px]`}>
            <option value="">Add member… (search users)</option>
            {candidates.map((user) => (
              <option key={user.id} value={user.id}>
                {nameOf(user)}
              </option>
            ))}
          </select>
          <Btn
            disabled={!toAdd || saving}
            onClick={async () => {
              if (!toAdd) return
              await change({ members: [...members, { userId: toAdd.id, isHead: false }] })
              setNewMember('')
            }}
          >
            Add
          </Btn>
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
export const DepartmentsTab: React.FC<{ slot: HTMLElement | null }> = ({ slot }) => {
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

  if (isLoading) return <div className="p-6"><Spinner /></div>

  return (
    <>
      <InHeader slot={slot}>{canEdit && <Btn primary onClick={() => setAdding(true)}>+ New department</Btn>}</InHeader>
      <TwoPane
        width={185}
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
