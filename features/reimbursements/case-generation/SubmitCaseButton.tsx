'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'

export interface SubmitCaseButtonProps {
  onSubmit: () => void
  disabled?: boolean
}

export const SubmitCaseButton: React.FC<SubmitCaseButtonProps> = ({ onSubmit, disabled }) => {
  return (
    <Button variant="primary" onClick={onSubmit} disabled={disabled}>
      Submit Case
    </Button>
  )
}

