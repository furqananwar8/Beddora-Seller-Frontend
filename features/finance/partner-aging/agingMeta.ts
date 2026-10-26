import type { AgingBucket, AgingGroup } from '@/services/api/finance.api'

/** How each half of the report reads: green while payments are coming due, red once they are past it. */
export const AGING_GROUP_META: Record<AgingGroup, { title: string; prefix: string; head: string }> = {
  upcoming: { title: 'Due in (days)', prefix: 'Due in', head: 'bg-success-600 text-white' },
  overdue: { title: 'Overdue (days)', prefix: 'Overdue', head: 'bg-danger-600 text-white' },
}

/** The buckets split into their groups, keeping the server's order within each. */
export const groupBuckets = (buckets: AgingBucket[]): Array<{ group: AgingGroup; buckets: AgingBucket[] }> =>
  (Object.keys(AGING_GROUP_META) as AgingGroup[])
    .map((group) => ({ group, buckets: buckets.filter((bucket) => bucket.group === group) }))
    .filter(({ buckets: inGroup }) => inGroup.length > 0)

/** "Due in 5 days", "Due today", "12 days overdue". */
export const dueLabel = (daysToDue: number): string => {
  if (daysToDue === 0) return 'Due today'
  if (daysToDue > 0) return `Due in ${daysToDue} day${daysToDue === 1 ? '' : 's'}`
  const late = -daysToDue
  return `${late} day${late === 1 ? '' : 's'} overdue`
}
