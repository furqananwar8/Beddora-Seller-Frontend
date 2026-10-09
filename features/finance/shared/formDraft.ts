/**
 * In-memory hand-off for a form while the user detours to create something it needs (a partner, a cost center).
 * Module state survives client-side navigation; a full reload clears it on purpose.
 */
export interface FormDraft<T> {
  save(next: T): void
  /** Read without clearing, so a dev double-mount cannot lose it; clear once applied. */
  peek(): T | null
  clear(): void
}

export function createFormDraft<T>(): FormDraft<T> {
  let draft: T | null = null
  return {
    save: (next) => {
      draft = next
    },
    peek: () => draft,
    clear: () => {
      draft = null
    },
  }
}
