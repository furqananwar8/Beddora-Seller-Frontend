export interface HeaderGroup {
  label: string | null
  span: number
}

/** Header groups over a table's columns: consecutive columns sharing a group form one cell; ungrouped ones get an empty one. */
export function headerGroups(columns: ReadonlyArray<{ group?: string }>): HeaderGroup[] {
  return columns.reduce<HeaderGroup[]>((groups, column) => {
    const last = groups[groups.length - 1]
    if (last && column.group && last.label === column.group) last.span += 1
    else groups.push({ label: column.group ?? null, span: 1 })
    return groups
  }, [])
}
