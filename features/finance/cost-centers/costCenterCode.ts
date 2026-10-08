/** Deepest level, L1 being 1. Keep in step with the backend's cost-center-code.ts. */
export const MAX_LEVEL = 4

export const LEVELS = Array.from({ length: MAX_LEVEL }, (_, index) => index + 1)

export const levelLabel = (level: number): string => `L${level}`

/**
 * A code with a dash between levels so the path reads at a glance: `CID#A1B12C3` → `CID#A1-B12-C3`.
 * Each level starts with its letter (A for L1, B for L2, ...). Display only: the API sends and stores it without
 * dashes, and search accepts either form.
 */
export const formatCostCenterCode = (code: string): string => code.replace(/(\d)(?=[A-Z])/g, '$1-')