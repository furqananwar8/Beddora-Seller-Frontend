export type Notify = (message: string, type: 'success' | 'error' | 'info') => void

/** What the screen hands each platform's panel. */
export interface PanelProps {
  /** A sync is running for this platform; row refreshes wait for it. */
  syncing: boolean
  notify: Notify
}

export async function copyText(text: string, label: string, notify: Notify): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    notify(`${label} copied`, 'success')
  } catch {
    notify('Could not copy to the clipboard', 'error')
  }
}

export const n = (value: number) => value.toLocaleString()
