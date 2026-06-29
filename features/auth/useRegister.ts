'use client'

import { useRegisterMutation } from '@/services/api/auth.api'

/**
 * Hook wrapping the register mutation with unified success/error handling.
 */
export function useRegister() {
  const [register, state] = useRegisterMutation()

  const submit = async (data: Parameters<typeof register>[0]) => {
    return register(data).unwrap()
  }

  return { submit, ...state }
}
