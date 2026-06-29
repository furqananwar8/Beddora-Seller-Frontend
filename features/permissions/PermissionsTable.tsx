'use client'

import React from 'react'
import type { UserPermissions } from '@/services/api/permissions.api'

interface Props {
  data: UserPermissions | undefined
  isLoading?: boolean
}

export const PermissionsTable: React.FC<Props> = ({ data, isLoading }) => {
  if (isLoading) {
    return <div className="text-sm text-secondary-600">Loading permissions...</div>
  }

  if (!data) {
    return <div className="text-sm text-secondary-600">No permissions loaded.</div>
  }

  const entries = Object.keys(data.permissions).sort()

  return (
    <div className="rounded border border-secondary-200 bg-white shadow-sm">
      <div className="border-b border-secondary-200 px-4 py-2 text-sm font-semibold text-secondary-900">
        Permissions
      </div>
      <div className="p-4 space-y-2">
        {entries.length === 0 && <div className="text-sm text-secondary-600">No permissions assigned.</div>}
        {entries.map((key) => (
          <div key={key} className="text-sm text-secondary-800">
            {key}
          </div>
        ))}
      </div>
    </div>
  )
}
