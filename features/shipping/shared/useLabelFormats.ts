import { useMemo } from 'react'
import { useGetShippingConfigQuery } from '@/services/api/shipping.api'
import type { LabelFormatOption, ProviderId } from '../types'

const NONE: LabelFormatOption[] = []

/** The label formats a provider supports (from /shipping/config); empty while loading. */
export function useLabelFormats(provider: ProviderId | undefined): LabelFormatOption[] {
  const { data } = useGetShippingConfigQuery()
  return useMemo(() => data?.providers.find((item) => item.id === provider)?.labelFormats ?? NONE, [data, provider])
}
