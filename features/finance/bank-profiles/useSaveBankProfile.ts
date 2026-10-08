import {
  useAddBankProfileDocumentsMutation,
  useCreateBankProfileMutation,
  useUpdateBankProfileMutation,
  type BankProfile,
} from '@/services/api/finance.api'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'
import { buildBankProfileFormData, buildBankProfilePatch, buildDocumentsFormData } from './bankProfilePayload'
import type { BankProfileFormValues } from './bankProfileSchema'

/**
 * Saves a bank profile with toast feedback: creates one, or updates `existing` and uploads any new documents.
 * Resolves to the saved profile, or null when saving failed.
 */
export function useSaveBankProfile(existing?: BankProfile) {
  const { success, failure } = useFinanceFeedback()
  const [create] = useCreateBankProfileMutation()
  const [update] = useUpdateBankProfileMutation()
  const [addDocuments] = useAddBankProfileDocumentsMutation()

  return async (values: BankProfileFormValues, files: File[]): Promise<BankProfile | null> => {
    try {
      if (!existing) {
        const created = await create(buildBankProfileFormData(values, files)).unwrap()
        success('Bank profile added')
        return created
      }
      const updated = await update({ id: existing.id, body: buildBankProfilePatch(values) }).unwrap()
      if (files.length) await addDocuments({ id: existing.id, body: buildDocumentsFormData(files) }).unwrap()
      success('Bank profile updated')
      return updated
    } catch (error) {
      failure(error, existing ? 'Could not update the bank profile' : 'Could not add the bank profile')
      return null
    }
  }
}
