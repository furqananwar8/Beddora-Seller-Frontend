/** Tax Amazon charged on each fee, as returned in amazonFeeDetails.feeTax. */
export type FeeTaxMap = Record<string, number>

const FEE_TAX_LABELS: Record<string, string> = {
  fbaPerUnitFulfillmentFee: 'FBA per unit fulfilment fee',
  referralFee: 'Referral fee',
  salesTaxCollectionFee: 'Sales tax collection fee',
  fbaStorageFee: 'FBA storage fee',
  refundCommission: 'Refund commission',
  fbaDisposalFee: 'FBA disposal fee',
  dealParticipationFee: 'Deal participation fee',
  dealPerformanceFee: 'Deal performance fee',
  other: 'Other',
}

export interface FeeTaxRow {
  key: string
  label: string
  value: number
}

/** One row per fee that carried tax, in display order. */
export function getFeeTaxRows(feeTax?: FeeTaxMap | null): FeeTaxRow[] {
  if (!feeTax) return []
  return Object.entries(FEE_TAX_LABELS)
    .map(([key, label]) => ({ key, label, value: Number(feeTax[key] || 0) }))
    .filter((row) => Math.abs(row.value) > 0)
}

export const sumFeeTaxRows = (rows: FeeTaxRow[]): number =>
  rows.reduce((total, row) => total + row.value, 0)
