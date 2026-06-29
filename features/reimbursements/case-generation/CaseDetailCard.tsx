'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import { Badge } from '@/design-system/badges'
import { ReimbursementCase } from '@/services/api/reimbursementCases.api'
import { formatDate } from '@/utils/format'

export interface CaseDetailCardProps {
  caseItem: ReimbursementCase
  sellerSupportUrl?: string
  onSubmit?: (caseItem: ReimbursementCase) => void
}

export const CaseDetailCard: React.FC<CaseDetailCardProps> = ({
  caseItem,
  sellerSupportUrl,
  onSubmit,
}) => {
  const statusVariant: Record<ReimbursementCase['submissionStatus'], 'secondary' | 'warning' | 'success'> = {
    draft: 'secondary',
    submitted: 'warning',
    resolved: 'success',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-text-muted mb-1">Type</div>
            <div className="font-medium">{caseItem.caseType.replace('_', ' ')}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted mb-1">Status</div>
            <Badge variant={statusVariant[caseItem.submissionStatus]}>{caseItem.submissionStatus}</Badge>
          </div>
          <div>
            <div className="text-sm text-text-muted mb-1">Marketplace</div>
            <div className="font-medium">{caseItem.marketplace?.name || caseItem.marketplaceId}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted mb-1">SKU</div>
            <div className="font-medium">{caseItem.sku || caseItem.product?.sku || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted mb-1">Created</div>
            <div className="font-medium">{formatDate(caseItem.createdAt)}</div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="text-sm font-medium text-text-primary mb-2">Claim Text</div>
          <pre className="whitespace-pre-wrap text-sm bg-surface border border-border rounded p-3">
            {caseItem.generatedText}
          </pre>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Button variant="primary" onClick={() => onSubmit?.(caseItem)}>
            Mark as Submitted
          </Button>
          {sellerSupportUrl && (
            <a
              className="text-sm text-primary-600 hover:text-primary-700"
              href={sellerSupportUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open Seller Support
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

