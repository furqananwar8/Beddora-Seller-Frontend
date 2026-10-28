/**
 * The one set of shades for status-coloured grid cells and their legend swatches, so every screen reads the same:
 * a 300 fill with black text on top.
 */
export type StatusTone = 'green' | 'yellow' | 'orange' | 'red'

export const STATUS_TONE: Record<StatusTone, { cell: string; swatch: string }> = {
  green: { cell: 'bg-success-300 text-black', swatch: 'bg-success-300 border-success-400' },
  yellow: { cell: 'bg-warning-300 text-black', swatch: 'bg-warning-300 border-warning-400' },
  orange: { cell: 'bg-orange-300 text-black', swatch: 'bg-orange-300 border-orange-400' },
  red: { cell: 'bg-danger-300 text-black', swatch: 'bg-danger-300 border-danger-400' },
}
