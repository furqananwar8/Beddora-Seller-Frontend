import { useCallback } from 'react'
import {
  useApprovePaymentRequestMutation,
  useRejectPaymentRequestMutation,
  useSubmitPaymentRequestMutation,
  useWithdrawPaymentRequestMutation,
} from '@/services/api/finance.api'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'
import { formatRequestNo } from '../shared/format'

/** Approve / reject / withdraw / resubmit with toasts; each resolves true when the API accepted it. */
export function useRequestActions() {
  const { success, failure } = useFinanceFeedback()
  const [approveMutation, approveState] = useApprovePaymentRequestMutation()
  const [rejectMutation, rejectState] = useRejectPaymentRequestMutation()
  const [withdrawMutation, withdrawState] = useWithdrawPaymentRequestMutation()
  const [submitMutation, submitState] = useSubmitPaymentRequestMutation()

  const approve = useCallback(
    async (id: number, note?: string) => {
      try {
        await approveMutation({ id, note: note?.trim() || undefined }).unwrap()
        success(`${formatRequestNo(id)} approved`)
        return true
      } catch (error) {
        failure(error, 'Could not approve the request')
        return false
      }
    },
    [approveMutation, success, failure]
  )

  const reject = useCallback(
    async (id: number, reason: string) => {
      try {
        await rejectMutation({ id, reason }).unwrap()
        success(`${formatRequestNo(id)} rejected`)
        return true
      } catch (error) {
        failure(error, 'Could not reject the request')
        return false
      }
    },
    [rejectMutation, success, failure]
  )

  const withdraw = useCallback(
    async (id: number) => {
      try {
        await withdrawMutation(id).unwrap()
        success(`${formatRequestNo(id)} returned to Draft. Edit it and submit it again.`)
        return true
      } catch (error) {
        failure(error, 'Could not resubmit the request')
        return false
      }
    },
    [withdrawMutation, success, failure]
  )

  const resubmit = useCallback(
    async (id: number) => {
      try {
        await submitMutation(id).unwrap()
        success(`${formatRequestNo(id)} sent for approval`)
        return true
      } catch (error) {
        failure(error, 'Could not submit the request')
        return false
      }
    },
    [submitMutation, success, failure]
  )

  return {
    approve,
    reject,
    withdraw,
    resubmit,
    busy: approveState.isLoading || rejectState.isLoading || withdrawState.isLoading || submitState.isLoading,
    rejecting: rejectState.isLoading,
  }
}
