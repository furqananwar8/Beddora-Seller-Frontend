'use client'

import React from 'react'
import { useListRolesQuery } from '@/services/api/permissions.api'

interface RoleSelectorProps {
  selectedRoleIds: string[]
  onChange: (roleIds: string[]) => void
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRoleIds, onChange }) => {
  const { data: roles } = useListRolesQuery()

  const toggle = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      onChange(selectedRoleIds.filter((r) => r !== roleId))
    } else {
      onChange([...selectedRoleIds, roleId])
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-secondary-900">Select Roles</div>
      <div className="space-y-2">
        {roles && roles.length > 0 ? (
          roles.map((role) => (
            <label
              key={role.id}
              className="flex items-start gap-3 p-3 border border-secondary-200 rounded-lg hover:bg-secondary-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedRoleIds.includes(role.id)}
                onChange={() => toggle(role.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-secondary-900">{role.name}</div>
                {role.description && (
                  <div className="text-xs text-secondary-500 mt-1">{role.description}</div>
                )}
              </div>
            </label>
          ))
        ) : (
          <div className="text-sm text-secondary-600 p-3">No roles found.</div>
        )}
      </div>
    </div>
  )
}
