'use client'

import React, { useState } from 'react'
import { PageHeader } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { Badge } from '@/design-system/badges'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { Input } from '@/design-system/inputs'
import { RoleSelector } from '@/features/permissions'
import { useListUsersQuery } from '@/services/api/users.api'
import { useGetUserPermissionsQuery, useUpdateUserPermissionsMutation, useListRolesQuery } from '@/services/api/permissions.api'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import { UserListItem } from '@/services/api/users.api'

/**
 * Admin page - Role & Permission Management (Sellerboard-style)
 * 
 * Features:
 * - Table view of all users
 * - Current roles displayed as badges
 * - Edit button opens modal to manage roles
 * - Inline role management
 */
export default function AdminPage() {
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  const dispatch = useAppDispatch()
  const accountId = useAppSelector((state) => state.auth.accountId)
  
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    dispatch(addNotification({ message, type }))
  }
  
  // Fetch users list
  const { data: users, isLoading: isLoadingUsers, refetch: refetchUsers } = useListUsersQuery()
  
  // Fetch roles list
  const { data: roles } = useListRolesQuery()
  
  // Update permissions mutation
  const [updatePermissions] = useUpdateUserPermissionsMutation()
  
  // Get the user being edited
  const editingUser = users?.find((u) => u.id === editingUserId)
  
  // Initialize selected roles when opening edit modal
  const handleEditClick = (user: UserListItem) => {
    setEditingUserId(user.id)
    setSelectedRoleIds(user.roles.map((r) => r.id))
  }
  
  const handleCloseModal = () => {
    setEditingUserId(null)
    setSelectedRoleIds([])
  }
  
  const handleUpdateRoles = async () => {
    if (!editingUserId) {
      showToast('No user selected', 'error')
      return
    }
    
    setIsUpdating(true)
    try {
      // Map role IDs to the format expected by the API
      const rolesData = selectedRoleIds.map((roleId) => ({
        roleId,
        accountId: accountId || undefined,
      }))
      
      await updatePermissions({
        userId: editingUserId,
        data: {
          roles: rolesData,
        },
      }).unwrap()
      
      showToast('User roles updated successfully', 'success')
      handleCloseModal()
      
      // Refresh users list to get updated roles
      await refetchUsers()
    } catch (error: any) {
      showToast(error?.data?.error || 'Failed to update user roles', 'error')
    } finally {
      setIsUpdating(false)
    }
  }
  
  const getRoleBadgeVariant = (roleName: string) => {
    const upperName = roleName.toUpperCase()
    if (upperName.includes('ADMIN')) return 'primary'
    if (upperName.includes('MANAGER')) return 'success'
    if (upperName.includes('VIEWER')) return 'secondary'
    return 'secondary'
  }
  
  // Filter users based on search query
  const filteredUsers = users?.filter((user) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.email.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(query) ||
      user.roles.some((role) => role.name.toLowerCase().includes(query))
    )
  }) || []
  
  return (
    <div>
      <PageHeader
        title="User Role Management"
        description="Manage roles and permissions for all users"
      />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users</CardTitle>
            <div className="w-64">
              <Input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="text-center py-8 text-secondary-600">Loading users...</div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-8 text-secondary-600">No users found</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-secondary-600">
              No users match your search query
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-secondary-900">
                          {user.name || 'No name'}
                        </span>
                        <span className="text-xs text-secondary-500">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-secondary-900">{user.email}</span>
                        {user.isVerified && (
                          <span className="text-success-600" title="Verified">
                            ✓
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={user.isActive ? 'success' : 'error'}
                          size="sm"
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {!user.isVerified && (
                          <Badge variant="warning" size="sm">
                            Unverified
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge
                              key={role.id}
                              variant={getRoleBadgeVariant(role.name)}
                              size="sm"
                            >
                              {role.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-secondary-500 italic">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(user)}
                      >
                        Edit Roles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Roles Modal */}
      <Modal
        isOpen={!!editingUserId}
        onClose={handleCloseModal}
        title={`Edit Roles - ${editingUser?.name || editingUser?.email || 'User'}`}
        size="md"
      >
        <div className="space-y-6">
          {/* User Info */}
          {editingUser && (
            <div className="p-4 bg-secondary-50 rounded-lg space-y-2">
              <div className="text-sm">
                <span className="font-semibold text-secondary-700">Email:</span>{' '}
                <span className="text-secondary-900">{editingUser.email}</span>
              </div>
              {editingUser.name && (
                <div className="text-sm">
                  <span className="font-semibold text-secondary-700">Name:</span>{' '}
                  <span className="text-secondary-900">{editingUser.name}</span>
                </div>
              )}
              <div className="text-sm">
                <span className="font-semibold text-secondary-700">Current Roles:</span>{' '}
                {editingUser.roles.length > 0 ? (
                  <span className="text-secondary-700">
                    {editingUser.roles.map((r) => r.name).join(', ')}
                  </span>
                ) : (
                  <span className="text-secondary-500 italic">No roles assigned</span>
                )}
              </div>
            </div>
          )}
          
          {/* Role Selector */}
          <div>
            <RoleSelector
              selectedRoleIds={selectedRoleIds}
              onChange={setSelectedRoleIds}
            />
          </div>
          
          {/* Available Roles Info */}
          {roles && roles.length > 0 && (
            <div className="text-xs text-secondary-500 bg-primary-50 p-3 rounded-lg">
              <p className="font-semibold mb-1">Available Roles:</p>
              <ul className="list-disc list-inside space-y-1">
                {roles.map((role: any) => (
                  <li key={role.id}>
                    <span className="font-medium">{role.name}</span>
                    {role.description && (
                      <span className="text-secondary-400"> - {role.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
            <Button
              variant="outline"
              onClick={handleCloseModal}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRoles}
              isLoading={isUpdating}
              disabled={isUpdating}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
