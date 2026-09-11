import { baseApi } from './baseApi'

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ChangePasswordResponse {
  message: string
}

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    changePassword: builder.mutation<ChangePasswordResponse, ChangePasswordRequest>({
      query: (data) => ({
        url: '/users/me/change-password',
        method: 'POST',
        body: data,
      }),
    }),
  }),
})

export const { useChangePasswordMutation } = userApi