/** Seller Central plans often have no name; show something readable instead of a blank. */
export const planTitle = (name: string | null | undefined): string => name?.trim() || 'Unnamed plan'
