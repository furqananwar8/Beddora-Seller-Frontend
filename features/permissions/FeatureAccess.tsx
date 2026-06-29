'use client'

import React from 'react'
import { useAppSelector } from '@/store/hooks'
import { hasPermission as hasPermissionSelector } from '@/store/permissions.slice'

interface Props {
  resource: string
  action: string
  children: React.ReactNode
}

export const FeatureAccess: React.FC<Props> = ({ resource, action, children }) => {
  const permissions = useAppSelector((s) => s.permissions.permissions)
  const allowed = hasPermissionSelector(permissions, resource, action)
  if (!allowed) return null
  return <>{children}</>
}
