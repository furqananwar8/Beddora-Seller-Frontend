const whole = (value: number) => Math.round(value).toLocaleString('en-US')

/** `PKR 50,000`: incentives are always whole rupees. */
export const formatPkr = (value: number) => `PKR ${whole(value)}`

/** `$72,000`: sales are shown to the dollar. */
export const formatUsd = (value: number) => `$${whole(value)}`

export const formatAmount = whole
