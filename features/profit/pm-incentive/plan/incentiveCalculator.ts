import { INCENTIVE_PLAN as PLAN, RAMADAN_ALLOWANCE_PKR, REWARDS, type RewardKey, type Slab } from './incentivePlan'

/** One manager's month: sales and ACoS come from their SKUs, conversion and rank are typed in. */
export interface ManagerMonth {
  id: string
  name: string
  salesUsd: number
  acosPct: number
  conversionPct: number
  categoryRank: number
}

export interface CompanyMonth {
  pkrPerUsd: number
  marginPct: number
  /** Pay the team bonus only when the margin reaches the plan's gate. */
  gateOnMargin: boolean
}

export interface RewardPicks {
  /** Winning manager id per award; missing or empty for no one. */
  winners: Partial<Record<RewardKey, string>>
  ramadan: boolean
}

export interface ManagerPayout {
  manager: ManagerMonth
  roas: number
  salesIncentive: number
  aboveTopSlab: boolean
  acosTier: number
  conversionTier: number
  adsBonus: number
  rankingBonus: number
  teamBonus: number
  additionalRewards: number
  total: number
}

export interface IncentiveTotals {
  salesIncentive: number
  bonuses: number
  teamBonus: number
  rewards: number
  payout: number
}

export interface IncentiveResult {
  totalSalesUsd: number
  teamPool: number
  gatePassed: boolean
  teamBonusEach: number
  payouts: ManagerPayout[]
  totals: IncentiveTotals
  /** The plan's share of contribution profit, in PKR. */
  capPkr: number
}

/** The payout of the highest slab the value reaches (0 below the first). */
const slabPayout = (slabs: readonly Slab[], value: number) => slabs.reduce((paid, [from, payout]) => (value >= from ? payout : paid), 0)

/** How many thresholds the value passes, read as a tier (0 = below plan). */
const tierOf = (thresholds: readonly number[], passes: (threshold: number) => boolean) => thresholds.filter(passes).length

export const salesIncentive = (salesUsd: number) => slabPayout(PLAN.salesSlabs, salesUsd)
export const teamPool = (totalSalesUsd: number) => slabPayout(PLAN.teamSlabs, totalSalesUsd)
export const acosTier = (acosPct: number) => (acosPct > 0 ? tierOf(PLAN.acosTierMaxPct, (max) => acosPct < max) : 0)
export const conversionTier = (conversionPct: number) => tierOf(PLAN.conversionTierMinPct, (min) => conversionPct >= min)
export const rankingBonus = (rank: number) => PLAN.rankBands.find(([best, worst]) => rank >= best && rank <= worst)?.[2] ?? 0
export const roasOf = (acosPct: number) => (acosPct > 0 ? Math.round((100 / acosPct) * 100) / 100 : 0)

function rewardsFor(managerId: string, picks: RewardPicks): number {
  const awards = REWARDS.reduce((sum, { key, amount }) => (picks.winners[key] === managerId ? sum + amount : sum), 0)
  return awards + (picks.ramadan ? RAMADAN_ALLOWANCE_PKR : 0)
}

function payoutOf(manager: ManagerMonth, teamBonus: number, picks: RewardPicks): ManagerPayout {
  const acos = acosTier(manager.acosPct)
  const conversion = conversionTier(manager.conversionPct)
  const sales = salesIncentive(manager.salesUsd)
  const ads = PLAN.adsPayoutByTier[Math.min(acos, conversion)]
  const ranking = rankingBonus(manager.categoryRank)
  const rewards = rewardsFor(manager.id, picks)
  return {
    manager,
    roas: roasOf(manager.acosPct),
    salesIncentive: sales,
    aboveTopSlab: manager.salesUsd > PLAN.salesSlabTopUsd,
    acosTier: acos,
    conversionTier: conversion,
    adsBonus: ads,
    rankingBonus: ranking,
    teamBonus,
    additionalRewards: rewards,
    total: sales + ads + ranking + teamBonus + rewards,
  }
}

/** Every manager's payout for the month, plus the company totals and the payout cap. */
export function calculateIncentives(managers: ManagerMonth[], company: CompanyMonth, picks: RewardPicks): IncentiveResult {
  const totalSalesUsd = managers.reduce((sum, m) => sum + m.salesUsd, 0)
  const pool = teamPool(totalSalesUsd)
  const gatePassed = !company.gateOnMargin || company.marginPct >= PLAN.teamMarginGatePct
  const teamBonusEach = gatePassed && managers.length ? Math.round(pool / managers.length) : 0
  const payouts = managers.map((manager) => payoutOf(manager, teamBonusEach, picks))

  const sum = (pick: (p: ManagerPayout) => number) => payouts.reduce((total, p) => total + pick(p), 0)
  const contributionUsd = (totalSalesUsd * company.marginPct) / 100
  return {
    totalSalesUsd,
    teamPool: pool,
    gatePassed,
    teamBonusEach,
    payouts,
    totals: {
      salesIncentive: sum((p) => p.salesIncentive),
      bonuses: sum((p) => p.adsBonus + p.rankingBonus),
      teamBonus: sum((p) => p.teamBonus),
      rewards: sum((p) => p.additionalRewards),
      payout: sum((p) => p.total),
    },
    capPkr: ((contributionUsd * PLAN.payoutCapPctOfContribution) / 100) * company.pkrPerUsd,
  }
}
