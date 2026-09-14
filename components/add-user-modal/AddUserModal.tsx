'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { PermissionTree, PermissionNode } from '../permission-tree/PermissionTree'
import {
  Invite,
  useGetPermissionsQuery,
  useCreateInviteMutation,
  useUpdateInvitePermissionsMutation,
} from '@/services/api/invites.api'

type Screen = 'form' | 'features' | 'accounts' | 'products'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  initialValues?: Invite | null
}

export const AddUserModal: React.FC<Props> = ({
  open,
  onClose,
  onSuccess,
  initialValues,
}) => {
  const isEditing = Boolean(initialValues)

  const [screen, setScreen] = useState<Screen>('form')
  const [email, setEmail] = useState('')
  const [validUntil, setValidUntil] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(true)
  const [featureIds, setFeatureIds] = useState<number[]>([])
  const [accountAccess, setAccountAccess] = useState({
    full: true,
    accountIds: [] as number[],
  })
  const [productAccess, setProductAccess] = useState({
    full: true,
    productIds: [] as number[],
  })

  const { data: permissions = [], isLoading: permsLoading } =
    useGetPermissionsQuery(undefined, { skip: !open })

  const [createInvite, { isLoading: creating }] = useCreateInviteMutation()
  const [updatePermissions, { isLoading: updating }] =
    useUpdateInvitePermissionsMutation()

  const submitting = creating || updating

  useEffect(() => {
    if (open) {
      setScreen('form')
      if (initialValues) {
        setEmail(initialValues.email || '')
        setValidUntil(
          initialValues.validUntil
            ? new Date(initialValues.validUntil).toISOString().split('T')[0]
            : null
        )
        setCanEdit(initialValues.canEdit ?? true)
        setFeatureIds(initialValues.featurePermissionIds || [])
        setAccountAccess(
          initialValues.accountAccess || { full: true, accountIds: [] }
        )
        setProductAccess(
          initialValues.productAccess || { full: true, productIds: [] }
        )
      } else {
        setEmail('')
        setValidUntil(null)
        setCanEdit(true)
        setFeatureIds([])
        setAccountAccess({ full: true, accountIds: [] })
        setProductAccess({ full: true, productIds: [] })
      }
    }
  }, [open, initialValues])

  const tree: PermissionNode[] = useMemo(() => {
    const byPage = new Map<
      string,
      {
        parent: (typeof permissions)[0] | null
        subs: Map<
          string,
          { read: (typeof permissions)[0]; write?: (typeof permissions)[0] }
        >
      }
    >()

    permissions.forEach((p) => {
      if (!byPage.has(p.page)) {
        byPage.set(p.page, { parent: null, subs: new Map() })
      }
      const entry = byPage.get(p.page)!

      if (p.subpage === null) {
        entry.parent = p
      } else {
        const existing = entry.subs.get(p.subpage) ?? {
          read: p,
          write: undefined,
        }
        if (p.action === 'read') existing.read = p
        if (p.action === 'write') existing.write = p
        entry.subs.set(p.subpage, existing)
      }
    })

    return Array.from(byPage.entries()).map(([page, m]) => {
      const children: PermissionNode[] = Array.from(m.subs.entries()).map(
        ([subpage, s]) => ({
          id: s.read.id,
          name: s.read.name,
          page,
          subpage,
          allIds: [s.read.id, s.write?.id].filter(Boolean) as number[],
        })
      )

      return {
        id: m.parent?.id ?? children[0]?.id ?? 0,
        name: m.parent?.name ?? page,
        page,
        subpage: null,
        allIds: [
          ...(m.parent ? [m.parent.id] : []),
          ...children.flatMap((c) => c.allIds),
        ],
        children,
      }
    })
  }, [permissions])

  const featureLabel = useMemo(() => {
    if (featureIds.length === 0) return 'No access'
    const total = tree.reduce((sum, n) => sum + n.allIds.length, 0)
    return featureIds.length === total
      ? 'Full access'
      : `${featureIds.length} selected`
  }, [featureIds, tree])

  const accountLabel = accountAccess.full
    ? 'Full access'
    : `${accountAccess.accountIds.length} accounts`
  const productLabel = productAccess.full
    ? 'Full access'
    : `${productAccess.productIds.length} products`

  const handleApply = async () => {
    if (!email.trim()) return

    try {
      if (isEditing && initialValues) {
        await updatePermissions({
          id: initialValues.id,
          featurePermissionIds: featureIds,
          accountAccess: accountAccess.full
            ? { full: true, accountIds: [] }
            : accountAccess,
          productAccess: productAccess.full
            ? { full: true, productIds: [] }
            : productAccess,
        }).unwrap()
      } else {
        await createInvite({
          email,
          featurePermissionIds: featureIds,
          validUntil: validUntil ? new Date(validUntil).toISOString() : null,
          canEdit,
          accountAccess: accountAccess.full
            ? { full: true, accountIds: [] }
            : accountAccess,
          productAccess: productAccess.full
            ? { full: true, productIds: [] }
            : productAccess,
        }).unwrap()
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      alert(
        err.data?.message ||
          err.error ||
          `Failed to ${isEditing ? 'update permissions' : 'send invite'}`
      )
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white shadow-xl rounded-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-blue-600 px-5 py-3 text-white">
          <h2 className="text-base font-semibold">
            {screen === 'form' &&
              (isEditing ? 'Update user permissions' : 'Add user')}
            {screen === 'features' && 'Feature access permissions'}
            {screen === 'accounts' && 'Account access'}
            {screen === 'products' && 'Product access'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-gray-200 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          {screen === 'form' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isEditing}
                  placeholder="Email"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
                {!isEditing && (
                  <p className="mt-1 text-xs text-gray-500">
                    The user will receive an email with instructions to activate
                    the access.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setScreen('features')}
                className="flex w-full items-center justify-between rounded border border-gray-200 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">
                  Feature access
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                    {featureLabel}
                  </span>
                  <span className="text-gray-400">&rsaquo;</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScreen('accounts')}
                className="flex w-full items-center justify-between rounded border border-gray-200 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">
                  Account access
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                    {accountLabel}
                  </span>
                  <span className="text-gray-400">&rsaquo;</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScreen('products')}
                className="flex w-full items-center justify-between rounded border border-gray-200 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">
                  Product access
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                    {productLabel}
                  </span>
                  <span className="text-gray-400">&rsaquo;</span>
                </div>
              </button>

              {/* Valid Until Checkbox - Disabled in Edit Mode */}
              <label
                className={`flex items-center gap-2 ${
                  isEditing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!validUntil}
                  disabled={isEditing}
                  onChange={(e) =>
                    setValidUntil(
                      e.target.checked
                        ? new Date().toISOString().split('T')[0]
                        : null
                    )
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed"
                />
                <span className="text-sm text-gray-700">Valid until</span>
              </label>
              {validUntil && (
                <input
                  type="date"
                  value={validUntil}
                  disabled={isEditing}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
              )}

              {/* Editing Mode Checkbox - Disabled in Edit Mode */}
              <label
                className={`flex items-center gap-2 ${
                  isEditing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={canEdit}
                  disabled={isEditing}
                  onChange={(e) => setCanEdit(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed"
                />
                <span className="text-sm text-gray-700">
                  Enable the editing mode (including COG&apos;s, expenses,
                  settings, etc.)
                </span>
              </label>
            </div>
          )}

          {screen === 'features' && (
            <div>
              <button
                type="button"
                onClick={() => setScreen('form')}
                className="mb-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Settings
              </button>
              {permsLoading ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  Loading permissions...
                </div>
              ) : (
                <PermissionTree
                  nodes={tree}
                  selectedIds={featureIds}
                  onChange={setFeatureIds}
                />
              )}
            </div>
          )}

          {screen === 'accounts' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setScreen('form')}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Settings
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accountAccess.full}
                  onChange={(e) =>
                    setAccountAccess({
                      full: e.target.checked,
                      accountIds: [],
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">
                  Full account access
                </span>
              </label>
              {!accountAccess.full && (
                <p className="text-xs text-gray-500">
                  Account picker would go here.
                </p>
              )}
            </div>
          )}

          {screen === 'products' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setScreen('form')}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Settings
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productAccess.full}
                  onChange={(e) =>
                    setProductAccess({
                      full: e.target.checked,
                      productIds: [],
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">
                  Full product access
                </span>
              </label>
              {!productAccess.full && (
                <p className="text-xs text-gray-500">
                  Product picker would go here.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          {screen === 'form' && (
            <button
              type="button"
              onClick={handleApply}
              disabled={submitting || !email.trim()}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? isEditing
                  ? 'Saving...'
                  : 'Sending...'
                : isEditing
                ? 'Save Changes'
                : 'Apply'}
            </button>
          )}
          {screen !== 'form' && (
            <button
              type="button"
              onClick={() => setScreen('form')}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Apply
            </button>
          )}
        </div>
      </div>
    </div>
  )
}