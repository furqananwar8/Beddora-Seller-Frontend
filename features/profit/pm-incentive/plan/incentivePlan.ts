/**
 * The Beddora PM incentive plan as data: sales in USD, payouts in PKR.
 * Every rule the calculator applies lives here, so a new tier is one line, not a code change.
 */

/** `[from, payout]`: the payout of the highest `from` the value reaches. */
export type Slab = readonly [from: number, payout: number]

/** `[best, worst, payout]`: an inclusive range of category ranks. */
export type RankBand = readonly [best: number, worst: number, payout: number]

export const INCENTIVE_PLAN = {
  /** Section 1: monthly sales of one manager. */
  salesSlabs: [[10_000, 5_000], [15_000, 10_000], [25_000, 20_000], [30_000, 35_000], [50_000, 40_000], [65_000, 50_000], [80_000, 80_000], [120_001, 100_000]] as readonly Slab[],
  /** Sales above this are still paid at the top tier until a higher one is added. */
  salesSlabTopUsd: 150_000,

  /** Section 2: ads & conversion, paid at the lower of the two tiers. Index = tier. */
  adsPayoutByTier: [0, 3_000, 6_000, 8_000, 10_000] as readonly number[],
  /** ACoS below 30 → tier 1, below 25 → 2, below 20 → 3, below 15 → 4. */
  acosTierMaxPct: [30, 25, 20, 15] as readonly number[],
  /** Conversion ≥ 8 → tier 1, ≥ 10 → 2, ≥ 12 → 3, ≥ 14 → 4. */
  conversionTierMinPct: [8, 10, 12, 14] as readonly number[],

  /** Section 3: best Amazon category rank. */
  rankBands: [[1, 3, 10_000], [4, 7, 6_000], [8, 10, 3_000]] as readonly RankBand[],

  /** Section 4: total Amazon sales of every manager, split equally. */
  teamSlabs: [[200_000, 30_000], [250_000, 60_000], [300_000, 90_000], [350_000, 150_000], [400_000, 210_000], [450_000, 300_000], [500_000, 450_000]] as readonly Slab[],
  teamMarginGatePct: 12,
  /** Total payout should stay within this share of contribution profit (sales × margin). */
  payoutCapPctOfContribution: 20,
} as const

/** Most either performance bonus (ads & conversion, ranking) pays. */
export const BONUS_MAX_PKR = 10_000

/** Additional rewards with one winner each. */
export const REWARDS = [
  { key: 'employeeOfMonth', label: 'Employee of the Month', amount: 10_000 },
  { key: 'quarterlyAchiever', label: 'Quarterly Achiever Award', amount: 25_000 },
  { key: 'annualAchiever', label: 'Annual Achiever Award', amount: 50_000 },
] as const

/** Paid to every manager in a Ramadan month. */
export const RAMADAN_ALLOWANCE_PKR = 10_000

export type RewardKey = (typeof REWARDS)[number]['key']

export const TIER_NAMES = ['below plan', 'tier 1', 'tier 2', 'tier 3', 'tier 4'] as const
