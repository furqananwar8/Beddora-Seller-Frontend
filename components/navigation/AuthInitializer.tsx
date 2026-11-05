'use client'

import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCredentials, setLoading, clearCredentials } from '@/store/auth.slice'
import { useGetCurrentUserQuery } from '@/services/api/auth.api'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { useGetMyPermissionsQuery } from '@/services/api/permissions.api'
import { setAccounts, setActiveAccount } from '@/store/accounts.slice'
import { setPermissions } from '@/store/permissions.slice'

/**
 * Auth initializer component
 * Asks the server who the session cookie belongs to, then loads accounts and permissions.
 * Should be placed in the root layout
 */
export const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useAppDispatch()
  const accountId = useAppSelector((state) => state.auth.accountId)
  const hasStoredUser = useAppSelector((state) => Boolean(state.auth.user))

  // The session cookie is the only credential: /auth/me answers 200 (logged in) or 401 (not)
  const {
    data: user,
    isError: sessionMissing,
    isLoading: isLoadingUser,
  } = useGetCurrentUserQuery()
  const isAuthenticated = Boolean(user)

  // Load accounts if authenticated
  const { data: accounts } = useGetAccountsQuery(undefined, {
    skip: !isAuthenticated,
  })

  // Load permissions if authenticated
  const {
    data: permissions,
    error: permissionsError,
  } = useGetMyPermissionsQuery(
    { accountId: accountId || undefined },
    { skip: !isAuthenticated }
  )

  // Mirror the session user into the store
  useEffect(() => {
    if (user) {
      dispatch(setCredentials({ user, accountId: accountId || undefined }))
      dispatch(setLoading(false))
    } else if (sessionMissing) {
      // clearCredentials resets the whole API cache (which refetches /auth/me), so only fire it
      // when there is a user to drop, otherwise a logged-out visit would loop on 401.
      if (hasStoredUser) dispatch(clearCredentials())
      dispatch(setLoading(false))
    }
  }, [user, sessionMissing, accountId, hasStoredUser, dispatch])

  // Update accounts in store
  useEffect(() => {
    if (accounts) {
      dispatch(setAccounts(accounts))
      const defaultAccount = accounts.find((acc) => acc.isDefault)
      if (defaultAccount) {
        dispatch(setActiveAccount(defaultAccount))
      }
    }
  }, [accounts, dispatch])

  // Update permissions in store
  useEffect(() => {
    if (permissions) {
      dispatch(setPermissions(permissions))
    }
  }, [permissions, dispatch])

  // NEW: if permissions fail to load, mark them as loaded with empty rules
  // so RouteGuard doesn't hang forever waiting for isLoaded === true
  useEffect(() => {
    if (permissionsError) {
      dispatch(setPermissions({ data: [] }))
    }
  }, [permissionsError, dispatch])

  return <>{children}</>
}