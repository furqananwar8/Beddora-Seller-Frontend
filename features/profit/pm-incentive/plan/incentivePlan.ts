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

  /** Section 2: advertising performance, paid at the lower of the ACoS and TACoS tiers. Index = tier. */
  adsPayoutByTier: [0, 3_000, 6_000, 10_000] as readonly number[],
  /** ACoS at or below 35 -> tier 1, 30 -> tier 2, 25 -> tier 3 (Target Achieved). */
  acosTierMaxPct: [35, 30, 25] as readonly number[],
  /** TACoS at or below 10 -> tier 1, 9 -> tier 2, 8 -> tier 3 (Target Achieved). */
  tacosTierMaxPct: [10, 9, 8] as readonly number[],

  /** Section 3: best Amazon category rank. */
  rankBands: [[1, 3, 10_000], [4, 7, 6_000], [8, 10, 3_000]] as readonly RankBand[],

  /** Section 4: total Amazon sales of every manager, split equally. */
  teamSlabs: [[200_000, 30_000], [250_000, 60_000], [300_000, 90_000], [350_000, 150_000], [400_000, 210_000], [450_000, 300_000], [500_000, 450_000]] as readonly Slab[],
  teamMarginGatePct: 12,
  /** Total payout should stay within this share of contribution profit (sales × margin). */
  payoutCapPctOfContribution: 20,
} as const

/** Most either performance bonus (advertising, ranking) pays. */
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

/** Advertising performance level per tier. */
export const TIER_NAMES = ['Not eligible', 'Needs Improvement', 'Good', 'Target Achieved'] as const
