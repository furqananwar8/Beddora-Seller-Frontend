'use client'

import React from 'react'
import { usePermission } from '@/features/permissions'
import { EmptyState } from '@/components/data-display'

/**
 * Permission-based route component
 * Renders children only if user has required permission
 * 
 * Usage:
 * <PermissionRoute resource="profit" action="read">
 *   <ProfitPage />
 * </PermissionRoute>
 */
export interface PermissionRouteProps {
  resource: string
  action: string
  children: React.ReactNode
}

export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  resource,
  action,
  children,
}) => {
  const hasAccess = usePermission(resource, action)

  if (!hasAccess) {
    return (
      <EmptyState
        title="Access Denied"
        description={`You don't have permission to ${action} ${resource}`}
      />
    )
  }

  return <>{children}</>
}
