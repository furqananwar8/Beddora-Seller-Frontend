/** Amazon's marketplace names as the backend sends them, in the words the team uses. */
const LABELS: Record<string, string> = {
  'Amazon.com': 'USA',
  'Amazon.ca': 'CANADA',
  'Amazon.mx': 'MX',
}

/** USA / CANADA / MX for the marketplaces we sell in; anything else is shown as Amazon gave it. */
export const marketplaceLabel = (name: string): string => LABELS[name] ?? name

export const marketplaceLabels = (names: string[]): string => names.map(marketplaceLabel).join(', ')
