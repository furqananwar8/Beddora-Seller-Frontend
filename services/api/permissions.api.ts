import { baseApi } from './baseApi'

/**
 * Permissions API endpoints
 */

export interface UserPermissions {
  permissions: Record<string, string> // e.g., { "profit.read": "profit.read", "inventory.write": "inventory.write" }
  roles: string[]
}

export interface Role {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  permissions?: Array<{
    permission: {
      id: string
      name: string
      resource: string
      action: string
    }
  }>
}

export interface UpdateUserPermissionsRequest {
  permissions?: Array<{
    resource: string
    action: string
    accountId?: string
    marketplaceId?: string
    productId?: string
    scope?: 'GLOBAL' | 'MARKETPLACE' | 'PRODUCT'
  }>
  roles?: Array<{ roleId: string; accountId?: string }>
}

export const permissionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyPermissions: builder.query<UserPermissions, { accountId?: string } | void>({
      query: (params) => ({
        url: '/permissions/me',
        ...(params && { params }),
      }),
      providesTags: ['Permissions'],
    }),
    updateUserPermissions: builder.mutation<
      { message: string },
      { userId: string; data: UpdateUserPermissionsRequest }
    >({
      query: ({ userId, data }) => ({
        url: `/permissions/${userId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Permissions', 'Auth'],
    }),
    listRoles: builder.query<Role[], void>({
      query: () => '/permissions/roles',
      providesTags: ['Permissions'],
    }),
    createRole: builder.mutation<any, { name: string; description?: string }>({
      query: (data) => ({
        url: '/permissions/roles',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Permissions'],
    }),
    createPermission: builder.mutation<
      any,
      { name: string; resource: string; action: string; scope?: 'GLOBAL' | 'MARKETPLACE' | 'PRODUCT'; description?: string }
    >({
      query: (data) => ({
        url: '/permissions/permissions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Permissions'],
    }),
    getUserPermissions: builder.query<UserPermissions, { userId: string; accountId?: string }>({
      query: ({ userId, accountId }) => ({
        url: `/permissions/${userId}`,
        params: accountId ? { accountId } : {},
      }),
      providesTags: ['Permissions'],
    }),
  }),
})

export const {
  useGetMyPermissionsQuery,
  useGetUserPermissionsQuery,
  useUpdateUserPermissionsMutation,
  useListRolesQuery,
  useCreateRoleMutation,
  useCreatePermissionMutation,
} = permissionsApi
