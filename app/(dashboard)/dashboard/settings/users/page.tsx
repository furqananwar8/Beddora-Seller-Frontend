'use client'

import React, { useMemo, useState } from 'react'
import { AddUserModal, EditableAccess } from '@/components/add-user-modal/AddUserModal'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { RowActionItem, RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { ScreenSearch } from '@/features/finance/shared/ScreenSearch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { Button } from '@/design-system/buttons'
import { TableSkeleton } from '@/design-system/loaders'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useGetInvitesQuery,
  useDeleteInviteMutation,
  useResendInviteMutation,
  useUpdateInvitePermissionsMutation,
} from '@/services/api/invites.api'
import {
  useGetManagedUsersQuery,
  useUpdateManagedUserPermissionsMutation,
} from '@/services/api/users.api'

const PAGE_SIZE = 10

type Tab = 'active' | 'invited'
type RowStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'EXPIRED' | 'REVOKED'

/** One table row, whether it is an existing user or a not-yet-accepted invite. */
interface UserRow {
  key: string
  source: 'user' | 'invite'
  id: number
  email: string
  name: string | null
  status: RowStatus
  validUntil: string | null
  featurePermissionIds: number[]
}

const STATUS_STYLES: Record<RowStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
  EXPIRED: 'bg-gray-100 text-gray-600',
  REVOKED: 'bg-gray-100 text-gray-600',
}

const CELL = 'text-center align-middle px-4 py-3'
const HEAD = 'text-center align-middle px-4 py-3 font-semibold uppercase text-xs text-gray-500'

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('active')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<UserRow | null>(null)

  const listParams = { page, limit: PAGE_SIZE, search: debouncedSearch }
  const usersQuery = useGetManagedUsersQuery(listParams, { skip: tab !== 'active' })
  const invitesQuery = useGetInvitesQuery(listParams, { skip: tab !== 'invited' })
  const [deleteInvite] = useDeleteInviteMutation()
  const [resendInvite] = useResendInviteMutation()
  const [updateInvitePermissions] = useUpdateInvitePermissionsMutation()
  const [updateUserPermissions] = useUpdateManagedUserPermissionsMutation()

  const query = tab === 'active' ? usersQuery : invitesQuery
  const pageData = query.data

  const rows: UserRow[] = useMemo(() => {
    if (tab === 'active') {
      return (usersQuery.data?.data ?? []).map((user) => ({
        key: `user-${user.id}`,
        source: 'user',
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
        validUntil: null,
        featurePermissionIds: user.featurePermissionIds,
      }))
    }
    return (invitesQuery.data?.data ?? []).flatMap((invite) =>
      invite.status === 'ACCEPTED'
        ? []
        : [
            {
              key: `invite-${invite.id}`,
              source: 'invite' as const,
              id: invite.id,
              email: invite.email,
              name: null,
              status: invite.status,
              validUntil: invite.validUntil,
              featurePermissionIds: invite.featurePermissionIds ?? [],
            },
          ]
    )
  }, [tab, usersQuery.data, invitesQuery.data])

  const refetch = () => query.refetch()

  const closeModal = () => {
    setModalOpen(false)
    setSelectedRow(null)
  }

  const handleUpdatePermissions = async (featurePermissionIds: number[]) => {
    if (!selectedRow) return
    const mutation =
      selectedRow.source === 'user' ? updateUserPermissions : updateInvitePermissions
    await mutation({ id: selectedRow.id, featurePermissionIds }).unwrap()
  }

  const handleDelete = async (row: UserRow) => {
    if (confirm(`Are you sure you want to delete ${row.email}?`)) {
      await deleteInvite(row.id)
      refetch()
    }
  }

  const handleResend = async (row: UserRow) => {
    await resendInvite(row.id)
    refetch()
  }

  const actionsFor = (row: UserRow): RowActionItem[] => {
    const update: RowActionItem = {
      key: 'update',
      label: 'Update',
      onSelect: () => {
        setSelectedRow(row)
        setModalOpen(true)
      },
    }
    if (row.source === 'user') return [update]
    return [
      update,
      { key: 'resend', label: 'Resend invitation link', onSelect: () => handleResend(row) },
      { key: 'delete', label: 'Delete', tone: 'danger', onSelect: () => handleDelete(row) },
    ]
  }

  const editableAccess: EditableAccess | null = selectedRow
    ? {
        email: selectedRow.email,
        validUntil: selectedRow.validUntil,
        featurePermissionIds: selectedRow.featurePermissionIds,
      }
    : null

  const showValidUntil = tab === 'invited'
  const columnCount = showValidUntil ? 5 : 4

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text-primary">Users</h1>
        <Button onClick={() => setModalOpen(true)} variant="primary">
          Add User
        </Button>
      </div>

      <ScreenSearch
        placeholder="Search users..."
        value={search}
        onChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedToggle<Tab>
          ariaLabel="Filter users"
          value={tab}
          onChange={(value) => {
            setTab(value)
            setPage(1)
          }}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'invited', label: 'Invited' },
          ]}
        />
      </div>

      {query.isLoading ? (
        <TableSkeleton rows={6} columns={columnCount} />
      ) : query.isError ? (
        <div className="text-center py-8 text-danger-600">
          Failed to load users. Please try again.
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[600px] border-collapse">
              <TableHeader>
                <TableRow>
                  <TableHead className={HEAD}>Name</TableHead>
                  <TableHead className={HEAD}>Email</TableHead>
                  <TableHead className={HEAD}>Status</TableHead>
                  {showValidUntil && <TableHead className={HEAD}>Valid until</TableHead>}
                  <TableHead className={HEAD}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key} className="hover:bg-surface-secondary transition-colors">
                    <TableCell className={`${CELL} font-medium text-text-primary`}>
                      {row.name || '—'}
                    </TableCell>
                    <TableCell className={`${CELL} text-text-muted`}>{row.email}</TableCell>
                    <TableCell className={CELL}>
                      <span
                        className={`inline-flex items-center justify-center rounded px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[row.status]}`}
                      >
                        {row.status}
                      </span>
                    </TableCell>
                    {showValidUntil && (
                      <TableCell className={`${CELL} text-text-muted`}>
                        {formatDate(row.validUntil)}
                      </TableCell>
                    )}
                    <TableCell className={CELL}>
                      <div className="flex items-center justify-center">
                        <RowActionsMenu label={row.email} items={actionsFor(row)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={columnCount}
                      className="text-center align-middle py-8 text-text-muted px-4"
                    >
                      {debouncedSearch
                        ? 'No users match your search.'
                        : tab === 'active'
                        ? 'No active users yet.'
                        : 'No pending invitations.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {pageData && (
            <PaginationFooter
              page={pageData.page}
              pageSize={pageData.limit}
              totalItems={pageData.totalRecords}
              totalPages={pageData.totalPages}
              onPageChange={setPage}
              itemLabel={tab === 'active' ? 'users' : 'invitations'}
            />
          )}
        </div>
      )}

      <AddUserModal
        open={modalOpen}
        initialValues={editableAccess}
        onUpdate={handleUpdatePermissions}
        onClose={closeModal}
        onSuccess={refetch}
      />
    </div>
  )
}
