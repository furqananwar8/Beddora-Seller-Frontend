/**
 * Cleans a typed number so it never shows a stray leading zero ("05" -> "5", "007.5" -> "7.5").
 * A single "0" and "0.x" are kept so the user can still type a decimal.
 */
export function sanitizeNumeric(raw: string, { decimal = false }: { decimal?: boolean } = {}): string {
  let value = raw.replace(decimal ? /[^\d.]/g : /\D/g, '')
  if (decimal) {
    const dot = value.indexOf('.')
    if (dot !== -1) value = value.slice(0, dot + 1) + value.slice(dot + 1).replace(/\./g, '')
  }
  const [whole, ...rest] = value.split('.')
  const trimmed = whole.replace(/^0+(?=\d)/, '')
  return rest.length ? `${trimmed === '' ? '0' : trimmed}.${rest.join('')}` : trimmed
}
