import type { PermissionNode } from './PermissionTree'

export type CheckState = 'checked' | 'partial' | 'unchecked'

/** Every row below a node, at any depth. */
export const descendants = (node: PermissionNode): PermissionNode[] => (node.children ?? []).flatMap((child) => [child, ...descendants(child)])

/**
 * The ids a row stands for on its own. A page with subpages has none: its own permission (e.g. `profit.read`)
 * is a section grant kept in sync by `withPageGrants`, not something the user ticks.
 */
const ownIds = (node: PermissionNode): number[] => (node.subpage === null && node.children?.length ? [] : node.allIds)

/** The ids a checkbox shows and toggles: its own plus every row below it. */
export const coveredIds = (node: PermissionNode): number[] => Array.from(new Set([node, ...descendants(node)].flatMap(ownIds)))

/** The page's own section grant, i.e. what it holds beyond the rows under it. */
const sectionIds = (page: PermissionNode): number[] => {
  const covered = new Set(coveredIds(page))
  return page.allIds.filter((id) => !covered.has(id))
}

export function checkState(node: PermissionNode, selected: ReadonlySet<number>): CheckState {
  const ids = coveredIds(node)
  const count = ids.filter((id) => selected.has(id)).length
  if (ids.length > 0 && count === ids.length) return 'checked'
  return count > 0 ? 'partial' : 'unchecked'
}

/** Grants a page's section permission while anything under it is selected, and drops it otherwise. */
export function withPageGrants(pages: PermissionNode[], ids: number[]): number[] {
  const selected = new Set(ids)
  for (const page of pages) {
    const sections = sectionIds(page)
    if (!sections.length) continue
    const anySelected = coveredIds(page).some((id) => selected.has(id))
    sections.forEach((id) => (anySelected ? selected.add(id) : selected.delete(id)))
  }
  return Array.from(selected)
}

/** Ticking a row selects it and everything below it; unticking a fully checked row clears them all. */
export function toggleNode(pages: PermissionNode[], node: PermissionNode, ids: number[]): number[] {
  const covered = coveredIds(node)
  const selected = new Set(ids)
  const next = checkState(node, selected) === 'checked' ? ids.filter((id) => !covered.includes(id)) : [...ids, ...covered]
  return withPageGrants(pages, next)
}
