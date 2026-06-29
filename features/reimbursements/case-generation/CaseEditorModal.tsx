'use client'

import React, { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { ReimbursementCase } from '@/services/api/reimbursementCases.api'

export interface CaseEditorModalProps {
  caseItem: ReimbursementCase
  onSave: (id: string, text: string) => void
  onClose: () => void
}

export const CaseEditorModal: React.FC<CaseEditorModalProps> = ({
  caseItem,
  onSave,
  onClose,
}) => {
  const [text, setText] = useState(caseItem.generatedText)

  const handleSave = () => {
    onSave(caseItem.id, text)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-w-3xl w-full mx-4">
        <h3 className="text-lg font-bold mb-4">Edit Case Text</h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border border-border rounded px-3 py-2 text-sm min-h-[240px]"
        />
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  )
}

