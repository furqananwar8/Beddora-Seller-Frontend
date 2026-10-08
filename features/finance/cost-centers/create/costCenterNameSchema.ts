import { z } from 'zod'

/** Same limit as the backend's cost-center.validation.ts. */
export const MAX_COST_CENTER_NAME = 120

export interface CostCenterNameValues {
  name: string
}

/**
 * A cost center's name: required, bounded, and unique among its siblings (case-insensitive).
 * `takenNames` holds the siblings' lower-cased names; `currentName` is the entry being renamed, which may keep its own name.
 */
export const makeCostCenterNameSchema = (takenNames: ReadonlySet<string>, currentName = '') =>
  z
    .object({
      name: z.string().trim().min(1, 'Name is required').max(MAX_COST_CENTER_NAME, `Keep it under ${MAX_COST_CENTER_NAME} characters`),
    })
    .superRefine(({ name }, ctx) => {
      const lower = name.toLowerCase()
      if (lower !== currentName.trim().toLowerCase() && takenNames.has(lower)) {
        ctx.addIssue({ code: 'custom', path: ['name'], message: `"${name}" already exists at this level` })
      }
    })
