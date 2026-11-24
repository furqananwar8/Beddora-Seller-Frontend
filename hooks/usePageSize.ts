import { usePathname } from 'next/navigation'
import { PAGE_SIZE_OPTIONS, useGetPageSizesQuery, useSavePageSizeMutation } from '@/services/api/pagePreferences.api'

/** Rows per page for the current screen: the signed-in user's saved choice, else `fallback`. */
export function usePageSize(fallback = 10): number {
  const pathname = usePathname()
  const { data } = useGetPageSizesQuery()
  const saved = data?.[pathname]
  if (saved && (PAGE_SIZE_OPTIONS as readonly number[]).includes(saved)) return saved
  // A screen default that isn't one of the choices snaps to the nearest, so the picker always shows a real option
  return PAGE_SIZE_OPTIONS.reduce((best, n) => (Math.abs(n - fallback) < Math.abs(best - fallback) ? n : best))
}

/** Saves the rows-per-page choice for the current screen. */
export function useSavePageSize() {
  const pathname = usePathname()
  const [save] = useSavePageSizeMutation()
  return (pageSize: number) => { void save({ pageKey: pathname, pageSize }) }
}
