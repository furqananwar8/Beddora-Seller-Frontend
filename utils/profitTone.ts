/** Text colour for a profit figure: green when it makes money (or breaks even), red when it loses money. */
export const profitTone = (value: number | null | undefined): string => ((value ?? 0) < 0 ? 'text-danger-600' : 'text-success-600')

/** Red only for a loss (e.g. a negative margin or ROI); anything else keeps the cell's own colour. */
export const lossTone = (value: number | null | undefined): string => ((value ?? 0) < 0 ? 'text-danger-600' : '')
