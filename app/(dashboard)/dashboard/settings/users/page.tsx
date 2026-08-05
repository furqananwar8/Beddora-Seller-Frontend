'use client'

import { AddUserModal } from '@/components/add-user-modal/AddUserModal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useGetInvitesQuery } from '@/services/api/invites.api'
import React, { useState } from 'react'

export default function UsersPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data: invites = [], isLoading, refetch } = useGetInvitesQuery()

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
      </div>

      {isLoading ? (
        <div className="py-10 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Valid until</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invites.map((invite) => (
                <tr key={invite.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{invite.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        invite.status === 'ACCEPTED'
                          ? 'bg-green-100 text-green-700'
                          : invite.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {invite.status === 'ACCEPTED' ? 'Active' : invite.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {invite.validUntil
                      ? new Date(invite.validUntil).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-gray-400 hover:text-gray-600">
                      •••
                    </button>
                  </td>
                </tr>
              ))}
              {invites.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No users invited yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-6 rounded bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-blue-700"
      >
        Add
      </button>

      <AddUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={refetch}
      />
    </div>
  )
}