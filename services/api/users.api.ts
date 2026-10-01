import { baseApi } from './baseApi'
import type { Page, PageParams } from './finance.api'

/**
 * Users API endpoints
 */

export interface Role {
  id: string
  name: string
  description: string | null
}

export interface User {
  id: string
  email: string
  name: string | null
  isActive: boolean
  isVerified: boolean
  verifiedAt: string | null
  twoFactorEnabled: boolean
  roles: string[]
  createdAt: string
  updatedAt: string
}

export interface UserListItem {
  id: string
  email: string
  name: string | null
  isActive: boolean
  isVerified: boolean
  verifiedAt: string | null
  createdAt: string
  roles: Role[]
}

/** A user administered from Settings > Users (seeded owners are excluded server-side). */
export interface ManagedUser {
  id: number
  email: string
  name: string | null
  isActive: boolean
  createdAt: string
  featurePermissionIds: number[]
}

export interface UpdateUserRequest {
  name?: string
  email?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentUser: builder.query<User, void>({
      query: () => '/users/me',
      providesTags: ['Auth'],
    }),
    updateCurrentUser: builder.mutation<User, UpdateUserRequest>({
      query: (data) => ({
        url: '/users/me',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),
    changePassword: builder.mutation<{ message: string }, ChangePasswordRequest>({
      query: (data) => ({
        url: '/users/me/change-password',
        method: 'POST',
        body: data,
      }),
    }),
    listUsers: builder.query<UserListItem[], void>({
      query: () => '/users',
      providesTags: ['Auth'],
    }),
    getManagedUsers: builder.query<Page<ManagedUser>, PageParams>({
      query: ({ search, ...params }) => ({
        url: '/users/managed',
        params: { ...params, search: search || undefined },
      }),
      providesTags: ['ManagedUsers'],
    }),
    updateManagedUserPermissions: builder.mutation<
      { message: string },
      { id: number; featurePermissionIds: number[] }
    >({
      query: ({ id, ...body }) => ({
        url: `/users/managed/${id}/permissions`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['ManagedUsers'],
    }),
  }),
})

export const {
  useGetCurrentUserQuery,
  useUpdateCurrentUserMutation,
  useChangePasswordMutation,
  useListUsersQuery,
  useGetManagedUsersQuery,
  useUpdateManagedUserPermissionsMutation,
} = usersApi
