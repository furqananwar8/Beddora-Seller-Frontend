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
 * Screens whose write permission is its own "Edit" box nested under the screen's box (`page.subpage`), like Purchase Orders > Edit,
 * so an account that can only view shows an empty Edit instead of a half-ticked screen.
 */
const EDIT_NESTED = new Set(['finance.payment-request'])

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
    const flat: PermissionNode[] = [...entry.subs.entries()].flatMap(([subpage, pair]) => {
      const screen: PermissionNode = { id: pair.read.id, name: pair.read.name, page, subpage, allIds: [pair.read.id, pair.write?.id].filter((id): id is number => id !== undefined) }
      if (!pair.write || !EDIT_NESTED.has(`${page}.${subpage}`)) return [screen]
      // The screen's box keeps viewing; write moves into "Edit" (a subpage named `<screen>.edit` nests under the screen)
      return [{ ...screen, allIds: [pair.read.id] }, { id: pair.write.id, name: pair.write.name, page, subpage: `${subpage}.edit`, allIds: [pair.write.id] }]
    })
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
