import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

export interface ServerIssue {
  field: string
  message: string
}

/** The `issues` array the API attaches to a 400 (`{ error, issues: [{ field, message }] }`). */
export function serverIssues(error: unknown): ServerIssue[] {
  const issues = (error as { data?: { issues?: unknown } } | undefined)?.data?.issues
  return Array.isArray(issues) ? issues.filter((issue): issue is ServerIssue => typeof issue?.field === 'string' && typeof issue?.message === 'string') : []
}

/**
 * Puts each server issue on the matching form field. Returns true when at least one landed,
 * so the caller can skip the generic toast and let the inline messages speak.
 */
export function applyServerIssues<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  /** Field names, or a test for dynamic paths such as `variations.3.sku`. */
  fields: readonly Path<T>[] | ((field: string) => boolean)
): boolean {
  const accepts = typeof fields === 'function' ? fields : (field: string) => fields.includes(field as Path<T>)
  let applied = false
  for (const issue of serverIssues(error)) {
    if (!accepts(issue.field)) continue
    setError(issue.field as Path<T>, { type: 'server', message: issue.message }, { shouldFocus: !applied })
    applied = true
  }
  return applied
}
