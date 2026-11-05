import { baseApi } from './baseApi'

/**
 * Authentication API endpoints
 */

export interface RegisterRequest {
  email: string
  password: string
  name?: string
  acceptTerms: boolean
  acceptPrivacy: boolean
}

export interface RegisterResponse {
  user: {
    id: string
    email: string
    name: string | null
    isActive: boolean
    isVerified: boolean
    createdAt: string
  }
  message: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: {
    id: string
    email: string
    name: string | null
    isVerified: boolean
    roles: string[]
  }
  permissions: Record<string, string>[]
  accountId?: string
  message: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface VerifyEmailRequest {
  token: string
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
    forgotPassword: builder.mutation<{ message: string }, ForgotPasswordRequest>({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),
    resetPassword: builder.mutation<{ message: string }, ResetPasswordRequest>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),
    verifyEmail: builder.query<{ message: string }, { token: string }>({
      query: ({ token }) => `/auth/verify-email?token=${token}`,
    }),
    getCurrentUser: builder.query<LoginResponse['user'], void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
  }),
})

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailQuery,
  useGetCurrentUserQuery,
} = authApi
