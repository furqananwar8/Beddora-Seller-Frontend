'use client'

import React, { useState, useRef, useEffect } from 'react'
import { AddUserModal } from '@/components/add-user-modal/AddUserModal'
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
import { 
  useGetInvitesQuery, 
  useDeleteInviteMutation, 
  useResendInviteMutation,
  Invite 
} from '@/services/api/invites.api'

interface ActionDropdownProps {
  invite: Invite
  onUpdate: (invite: Invite) => void
  onDelete: (invite: Invite) => void
  onResend: (invite: Invite) => void
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({
  invite,
  onUpdate,
  onDelete,
  onResend,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right - 192,
      })
    }
    setIsOpen((prev) => !prev)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleScroll = () => {
      if (isOpen) setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  return (
    <div className="inline-block text-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors focus:outline-none"
        aria-label="Actions"
      >
        •••
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
          className="z-50 w-48 origin-top-right rounded-md bg-white border border-gray-200 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100"
        >
          <div className="py-1 text-left">
            <button
              onClick={() => {
                setIsOpen(false)
                onUpdate(invite)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Update
            </button>
            {invite.status !== 'ACCEPTED' && (
              <button
                onClick={() => {
                  setIsOpen(false)
                  onResend(invite)
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Resend invitation link
              </button>
            )}
          </div>
          <div className="py-1 text-left">
            <button
              onClick={() => {
                setIsOpen(false)
                onDelete(invite)
              }}
              className="w-full text-left px-4 py-2 text-sm text-danger-600 hover:bg-gray-100 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UsersPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null)

  const { data: invites = [], isLoading, error, refetch } = useGetInvitesQuery()
  const [deleteInvite] = useDeleteInviteMutation()
  const [resendInvite] = useResendInviteMutation()

  const handleOpenAddModal = () => {
    setSelectedInvite(null)
    setModalOpen(true)
  }

  const handleUpdate = (invite: Invite) => {
    setSelectedInvite(invite)
    setModalOpen(true)
  }

  const handleDelete = async (invite: Invite) => {
    if (confirm(`Are you sure you want to delete ${invite.email}?`)) {
      await deleteInvite(invite.id)
      refetch()
    }
  }

  const handleResend = async (invite: Invite) => {
    await resendInvite(invite.id)
    refetch()
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Users</h1>
        </div>
        <TableSkeleton rows={6} columns={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Users</h1>
        <div className="text-center py-8 text-danger-600">
          Failed to load users. Please try again.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-text-primary">Users</h1>
        <Button onClick={handleOpenAddModal} variant="primary">
          Add User
        </Button>
      </div>

      <div className="w-full overflow-hidden rounded border border-gray-200 bg-white">
        <Table className="w-full table-fixed border-collapse">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%] text-center align-middle px-4 py-3 font-semibold uppercase text-xs text-gray-500">
                Email
              </TableHead>
              <TableHead className="w-[20%] text-center align-middle px-4 py-3 font-semibold uppercase text-xs text-gray-500">
                Status
              </TableHead>
              <TableHead className="w-[25%] text-center align-middle px-4 py-3 font-semibold uppercase text-xs text-gray-500">
                Valid until
              </TableHead>
              <TableHead className="w-[20%] text-center align-middle px-4 py-3 font-semibold uppercase text-xs text-gray-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite) => (
              <TableRow
                key={invite.id}
                className="hover:bg-surface-secondary transition-colors"
              >
                {/* Email (Centered) */}
                <TableCell className="w-[35%] text-center align-middle font-medium text-text-primary truncate px-4 py-3">
                  {invite.email}
                </TableCell>

                {/* Status (Centered) */}
                <TableCell className="w-[20%] text-center align-middle px-4 py-3">
                  <div className="flex items-center justify-center w-full">
                    <span
                      className={`inline-flex items-center justify-center rounded px-2.5 py-0.5 text-xs font-semibold ${
                        invite.status === 'ACCEPTED'
                          ? 'bg-green-100 text-green-700'
                          : invite.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {invite.status === 'ACCEPTED' ? 'ACTIVE' : invite.status}
                    </span>
                  </div>
                </TableCell>

                {/* Valid Until (Centered) */}
                <TableCell className="w-[25%] text-center align-middle text-text-muted px-4 py-3">
                  {invite.validUntil
                    ? new Date(invite.validUntil).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '—'}
                </TableCell>

                {/* Actions (Centered) */}
                <TableCell className="w-[20%] text-center align-middle px-4 py-3">
                  <div className="flex items-center justify-center w-full">
                    <ActionDropdown
                      invite={invite}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onResend={handleResend}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {invites.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center align-middle py-8 text-text-muted px-4"
                >
                  No users invited yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AddUserModal
        open={modalOpen}
        initialValues={selectedInvite}
        onClose={() => {
          setModalOpen(false)
          setSelectedInvite(null)
        }}
        onSuccess={() => refetch()}
      />
    </div>
  )
}