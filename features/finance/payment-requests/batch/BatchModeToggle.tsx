'use client'

import React from 'react'
import { Switch } from '@/components/switch/Switch'

interface BatchModeToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

/** The "Batch" switch beside the screen title: one partner, several requests at once. */
export const BatchModeToggle: React.FC<BatchModeToggleProps> = ({ checked, onChange, disabled }) => (
  <label className="ml-auto flex items-center gap-2 text-sm font-medium text-text-secondary">
    Batch
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label="Batch mode" />
  </label>
)
