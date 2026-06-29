import {
  useGetCasesQuery,
  useCreateCaseMutation,
  useUpdateCaseMutation,
} from '@/services/api/reimbursementCases.api'

export const useFetchCases = useGetCasesQuery
export const useGenerateCase = useCreateCaseMutation
export const useUpdateCase = useUpdateCaseMutation

