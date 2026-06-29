'use client'

import React, { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { initializeAuth, setCredentials, updateAccessToken, setLoading, clearCredentials } from '@/store/auth.slice'
import { useGetCurrentUserQuery, useRefreshTokenMutation } from '@/services/api/auth.api'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { useGetMyPermissionsQuery } from '@/services/api/permissions.api'
import { setAccounts, setActiveAccount } from '@/store/accounts.slice'
import { setPermissions } from '@/store/permissions.slice'

/**
 * Auth initializer component
 * Loads user data, accounts, and permissions on app start
 * Should be placed in the root layout
 */
export const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch()
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const accountId = useAppSelector((state) => state.auth.accountId)
  const [refresh] = useRefreshTokenMutation()
  const hasAttemptedRefresh = useRef(false)
  const isInitialized = useRef(false)

  // Initialize auth from localStorage (only once)
  useEffect(() => {
    if (!isInitialized.current) {
      dispatch(setLoading(true))
      dispatch(initializeAuth())
      isInitialized.current = true
    }
  }, [dispatch])

  // Attempt refresh on load if no access token (only once)
  useEffect(() => {
    // Only attempt refresh once, and only if we don't have an access token
    if (accessToken) {
      // If we have a token, wait for user data to load before setting loading to false
      return
    }

    // Prevent multiple refresh attempts
    if (hasAttemptedRefresh.current) {
      return
    }

    const doRefresh = async () => {
      hasAttemptedRefresh.current = true
      try {
        dispatch(setLoading(true))
        const result = await refresh().unwrap()
        dispatch(updateAccessToken(result.accessToken))
        // Keep loading true until user data loads
      } catch (error: any) {
        // If refresh fails (401), clear credentials and stop trying
        dispatch(clearCredentials())
        dispatch(setLoading(false))
        // Don't retry on 401 - user needs to login again
      }
    }

    void doRefresh()
  }, [accessToken, refresh, dispatch])

  // Load user data if authenticated
  const { data: user, error: userError, isLoading: isLoadingUser } = useGetCurrentUserQuery(undefined, {
    skip: !accessToken,
  })

  // Load accounts if authenticated
  const { data: accounts } = useGetAccountsQuery(undefined, {
    skip: !accessToken,
  })

  // Load permissions if authenticated
  const { data: permissions } = useGetMyPermissionsQuery(
    { accountId: accountId || undefined },
    {
      skip: !accessToken,
    }
  )

  // Update store when data loads
  useEffect(() => {
    if (user && accessToken) {
      dispatch(
        setCredentials({
          user,
          accessToken,
          accountId: accountId || undefined,
        })
      )
      dispatch(setLoading(false))
    } else if (accessToken && userError) {
      // If we have a token but user query failed (e.g., 401), clear credentials
      dispatch(clearCredentials())
      dispatch(setLoading(false))
    } else if (accessToken && !user && !isLoadingUser) {
      // If we have a token but user data failed to load and we're not loading, clear auth
      // This handles edge cases where the token is invalid
      dispatch(clearCredentials())
      dispatch(setLoading(false))
    }
    // If accessToken exists but user is still loading, keep loading state (don't change it)
  }, [user, accessToken, accountId, dispatch, userError, isLoadingUser])

  useEffect(() => {
    if (accounts) {
      dispatch(setAccounts(accounts))
      const defaultAccount = accounts.find((acc) => acc.isDefault)
      if (defaultAccount) {
        dispatch(setActiveAccount(defaultAccount))
      }
    }
  }, [accounts, dispatch])

  useEffect(() => {
    if (permissions) {
      dispatch(setPermissions(permissions))
    }
  }, [permissions, dispatch])

  return <>{children}</>
}
