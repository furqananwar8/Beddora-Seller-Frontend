'use client'

import React from 'react'
import { useAppSelector } from '@/store/hooks'
import { hasPermission } from '@/store/permissions.slice'
import { EmptyState } from '@/components/data-display'

/**
 * Permission guard component
 * Renders children only if user has required permission
 * 
 * Usage:
 * <PermissionGuard resource="profit" action="read">
 *   <ProfitComponent />
 * </PermissionGuard>
 */
export interface PermissionGuardProps {
  resource: string
  action: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resource,
  action,
  children,
  fallback,
}) => {
  const permissions = useAppSelector((state) => state.permissions.permissions)

  const hasAccess = hasPermission(permissions, resource, action)

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <EmptyState
        title="Access Denied"
        description={`You don't have permission to ${action} ${resource}`}
      />
    )
  }

  return <>{children}</>
}
