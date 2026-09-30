'use client'

import React, { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import {
  useAddApproverMutation,
  useGetApproverCandidatesQuery,
  useGetApproversQuery,
  useRemoveApproverMutation,
} from '@/services/api/finance.api'
import { useDebounce } from '@/utils/debounce'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'

export const ApproversModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { success, failure } = useFinanceFeedback()
  const currentUserId = useAppSelector((state) => state.auth.user?.id)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 300)
  const { data: approvers, isLoading } = useGetApproversQuery(undefined, { skip: !isOpen })
  const { data: candidates, isFetching } = useGetApproverCandidatesQuery(debounced, { skip: !isOpen })
  const [add, { isLoading: adding }] = useAddApproverMutation()
  const [remove, { isLoading: removing }] = useRemoveApproverMutation()

  const addUser = async (userId: number) => {
    try {
      await add(userId).unwrap()
      success('Approver added')
    } catch (error) {
      failure(error, 'Could not add the approver')
    }
  }

  const removeUser = async (userId: number) => {
    try {
      await remove(userId).unwrap()
      success('Approver removed')
    } catch (error) {
      failure(error, 'Could not remove the approver')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Approvers" size="md">
      <p className="mb-3 text-sm text-text-muted">
        People who can approve or reject payment requests (this grants them the finance payment-approval permission). Adding someone here gives them
        the &apos;Payment Approval&apos; permission only. Other permissions, such as Expense Types and Approver Management, are assigned in Settings &gt; Users.
      </p>
      <h3 className="mb-2 text-sm font-semibold text-text-primary">Current approvers</h3>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {(approvers ?? []).map((approver) => {
            const isSelf = currentUserId !== undefined && String(approver.user.id) === String(currentUserId)
            return (
            <li key={approver.user.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {approver.user.name ?? approver.user.email}
                  {isSelf && <span className="ml-2 text-xs font-normal text-text-muted">You</span>}
                </p>
                <p className="truncate text-xs text-text-muted">{approver.user.email}</p>
              </div>
              {!isSelf && (
                <Button size="sm" variant="outline" disabled={removing} onClick={() => removeUser(approver.user.id)}>
                  Remove
                </Button>
              )}
            </li>
            )
          })}
          {(approvers ?? []).length === 0 && <li className="py-4 text-center text-sm text-text-muted">No approvers yet.</li>}
        </ul>
      )}

      <h3 className="mb-2 mt-5 text-sm font-semibold text-text-primary">Add an approver</h3>
      <input
        type="search"
        aria-label="Search users"
        placeholder="Search by name or email"
        className="ds-input ds-input-default mb-2 w-full rounded-lg"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul className="max-h-48 divide-y divide-border/50 overflow-auto">
        {(candidates ?? []).map((user) => (
          <li key={user.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-text-primary">{user.name ?? user.email}</p>
              <p className="truncate text-xs text-text-muted">{user.email}</p>
            </div>
            <Button size="sm" disabled={adding} onClick={() => addUser(user.id)}>
              Add
            </Button>
          </li>
        ))}
        {!isFetching && (candidates ?? []).length === 0 && <li className="py-4 text-center text-sm text-text-muted">No matching users.</li>}
      </ul>
    </Modal>
  )
}
