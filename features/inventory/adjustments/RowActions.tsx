import React from 'react'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'

export type AdjustmentAction = 'dimensions' | 'quantity'

const ACTIONS: { action: AdjustmentAction; label: string }[] = [
  { action: 'dimensions', label: 'Edit box dimensions' },
  { action: 'quantity', label: 'Edit quantity' },
]

/** Three-dot menu for one adjustments row, using the app's shared row actions menu. */
export const RowActions: React.FC<{ label: string; onSelect: (action: AdjustmentAction) => void }> = ({ label, onSelect }) => (
  <RowActionsMenu
    label={label}
    items={ACTIONS.map(({ action, label: text }) => ({ key: action, label: text, onSelect: () => onSelect(action) }))}
  />
)
