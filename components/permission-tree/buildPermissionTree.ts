import type { PermissionNode } from './PermissionTree'

/** A permission row as the API lists it. */
export interface PermissionRow {
  id: number
  name: string
  page: string
  subpage: string | null
  action: string
}

/**
 * Groups permissions into the tree the Settings screens show: page → subpage (read and write together). A subpage
 * named `parent.child` (e.g. `price-analysis.approval`) is listed under its parent subpage instead of beside it.
 */
export function buildPermissionTree(permissions: PermissionRow[]): PermissionNode[] {
  const byPage = new Map<string, { parent: PermissionRow | null; subs: Map<string, { read: PermissionRow; write?: PermissionRow }> }>()

  for (const permission of permissions) {
    const entry = byPage.get(permission.page) ?? { parent: null, subs: new Map() }
    byPage.set(permission.page, entry)
    if (permission.subpage === null) {
      entry.parent = permission
      continue
    }
    const pair = entry.subs.get(permission.subpage) ?? { read: permission }
    if (permission.action === 'read') pair.read = permission
    if (permission.action === 'write') pair.write = permission
    entry.subs.set(permission.subpage, pair)
  }

  return [...byPage.entries()].map(([page, entry]) => {
    const flat: PermissionNode[] = [...entry.subs.entries()].map(([subpage, pair]) => ({
      id: pair.read.id,
      name: pair.read.name,
      page,
      subpage,
      allIds: [pair.read.id, pair.write?.id].filter((id): id is number => id !== undefined),
    }))
    const bySubpage = new Map(flat.map((node) => [node.subpage!, node]))
    const parentOf = (node: PermissionNode) => bySubpage.get(node.subpage!.split('.').slice(0, -1).join('.'))
    const top: PermissionNode[] = []
    for (const node of flat) {
      const parent = node.subpage!.includes('.') ? parentOf(node) : undefined
      if (parent) parent.children = [...(parent.children ?? []), node]
      else top.push(node)
    }
    return {
      id: entry.parent?.id ?? flat[0]?.id ?? 0,
      name: entry.parent?.name ?? page,
      page,
      subpage: null,
      // The page's own permission plus every one under it, nested or not
      allIds: [...(entry.parent ? [entry.parent.id] : []), ...flat.flatMap((node) => node.allIds)],
      children: top,
    }
  })
}
