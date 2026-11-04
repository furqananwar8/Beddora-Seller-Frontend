import type { RankCell } from '@/types/campaignPerformance.types'

/** Rank at (and beyond) which the colour is fully red. */
export const WORST_RANK = 60

/** Green at rank 1 through yellow and orange to red at {@link WORST_RANK}. */
export const rankColor = (rank: number): string => {
  const share = Math.min(Math.max((rank - 1) / (WORST_RANK - 1), 0), 1)
  return `hsl(${Math.round(120 - share * 120)} 72% 58%)`
}

/** The gradient the legend shows, the same scale as {@link rankColor}. */
export const RANK_LEGEND_GRADIENT = `linear-gradient(to right, ${rankColor(1)}, ${rankColor(20)}, ${rankColor(40)}, ${rankColor(WORST_RANK)})`

export interface RankDisplay {
  label: string
  /** Fill colour; null for a neutral cell. */
  background: string | null
  title: string
}

/** What a day's rank cell shows: the position, "Not in top results" or "No data". */
export function describeRank(cell: RankCell | undefined): RankDisplay {
  if (!cell || cell.status === 'NO_DATA') return { label: '—', background: null, title: 'No rank data for this day' }
  if (cell.status === 'NOT_IN_TOP' || cell.rank == null) return { label: 'Not in top results', background: null, title: 'Not found in the results checked' }
  return { label: String(cell.rank), background: rankColor(cell.rank), title: `Ranks #${cell.rank} for this keyword` }
}
