/** Colors offered in every color dropdown. Anything else a user adds is saved with the product and offered from then on. */
export const COMMON_COLORS = [
  'Black',
  'White',
  'Grey',
  'Silver',
  'Brown',
  'Beige',
  'Natural',
  'Red',
  'Orange',
  'Yellow',
  'Green',
  'Blue',
  'Navy',
  'Purple',
  'Pink',
  'Gold',
] as const

/** The dropdown's colors: the common ones, then colors already used on products, then the one currently chosen if it is neither. Case-insensitive, first spelling wins. */
export function colorOptions(inUse: readonly string[], current?: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const color of [...COMMON_COLORS, ...[...inUse].sort((a, b) => a.localeCompare(b)), ...(current ? [current] : [])]) {
    const key = color.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(color.trim())
  }
  return result
}
