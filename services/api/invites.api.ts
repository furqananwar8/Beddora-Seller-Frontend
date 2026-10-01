import { baseApi } from './baseApi'
import type { Page, PageParams } from './finance.api'

export interface Permission {
  id: number
  name: string
  resource: string
  action: string
  page: string
  subpage: string | null
  description: string | null
}

export interface Invite {
  id: number
  email: string
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
  validUntil: string | null
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
  featurePermissionIds?: number[]
}

export interface CreateInvitePayload {
  email: string
  featurePermissionIds: number[]
  validUntil?: string | null
}

export interface UpdateInvitePermissionsPayload {
  id: number
  featurePermissionIds?: number[]
}

export interface CreateInviteResponse {
  inviteId: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export const invitesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPermissions: builder.query<Permission[], void>({
      query: () => '/permissions',
      transformResponse: (response: ApiResponse<Permission[]>) => response.data,
      providesTags: ['Permissions'],
      keepUnusedDataFor: 600,
    }),

    getInvites: builder.query<Page<Invite>, PageParams>({
      query: ({ search, ...params }) => ({
        url: '/invites/list',
        params: { ...params, search: search || undefined },
      }),
      providesTags: ['Invites'],
      keepUnusedDataFor: 60,
    }),

    createInvite: builder.mutation<CreateInviteResponse, CreateInvitePayload>({
      query: (payload) => ({
        url: '/invites',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Invites'],
    }),

    // Update user permissions / invite parameters
    updateInvitePermissions: builder.mutation<Invite, UpdateInvitePermissionsPayload>({
      query: ({ id, ...body }) => ({
        url: `/invites/${id}/permissions`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Invites'],
    }),

    // Permanently delete invite / user account
    deleteInvite: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/invites/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Invites'],
    }),

    // Resend invitation link
    resendInvite: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/invites/${id}/resend`,
        method: 'POST',
      }),
      invalidatesTags: ['Invites'],
    }),

    // Public: validate token before showing form
    getInviteByToken: builder.query<{ email: string }, string>({
      query: (token) => `/invites/${token}`,
    }),

    // Public: accept invite and create user
    acceptInviteByToken: builder.mutation<
      { userId: number },
      { token: string; password: string; name?: string }
    >({
      query: ({ token, ...body }) => ({
        url: `/invites/${token}/accept`,
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useGetPermissionsQuery,
  useGetInvitesQuery,
  useCreateInviteMutation,
  useUpdateInvitePermissionsMutation,
  useDeleteInviteMutation,
  useResendInviteMutation,
  useGetInviteByTokenQuery,
  useAcceptInviteByTokenMutation,
} = invitesApi