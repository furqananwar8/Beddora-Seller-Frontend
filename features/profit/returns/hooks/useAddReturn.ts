import { useCreateReturnMutation } from '@/services/api/returns.api'

export const useAddReturn = () => {
  return useCreateReturnMutation()
}

