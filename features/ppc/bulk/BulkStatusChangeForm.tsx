'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { BulkActionResult, BulkStatusChangeInput } from '@/types/ppcBulk.types'

export interface BulkStatusChangeFormProps {
  accountId: string
  onPreview: (payload: BulkStatusChangeInput) => Promise<BulkActionResult | undefined>
  onApply: (payload: BulkStatusChangeInput) => Promise<BulkActionResult | undefined>
}

export const BulkStatusChangeForm: React.FC<BulkStatusChangeFormProps> = ({
  accountId,
  onPreview,
  onApply,
}) => {
  const [targetType, setTargetType] = useState<BulkStatusChangeInput['targetType']>('keyword')
  const [targetIdsText, setTargetIdsText] = useState('')
  const [status, setStatus] = useState<BulkStatusChangeInput['status']>('paused')
  const [marketplaceId, setMarketplaceId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [sku, setSku] = useState('')
  const [preview, setPreview] = useState<BulkActionResult | null>(null)

  const targetIds = useMemo(
    () => targetIdsText.split(',').map((value) => value.trim()).filter(Boolean),
    [targetIdsText]
  )

  const basePayload = (): BulkStatusChangeInput => ({
    accountId,
    targetType,
    targetIds: targetIds.length ? targetIds : undefined,
    marketplaceId: marketplaceId || undefined,
    keyword: keyword || undefined,
    sku: sku || undefined,
    status,
  })

  const handlePreview = async () => {
    const result = await onPreview({ ...basePayload(), preview: true })
    if (result) setPreview(result)
  }

  const handleApply = async () => {
    const result = await onApply({ ...basePayload(), preview: false })
    if (result) setPreview(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Status Change</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Target Type"
            value={targetType}
            options={[
              { value: 'campaign', label: 'Campaigns' },
              { value: 'adGroup', label: 'Ad Groups' },
              { value: 'keyword', label: 'Keywords' },
            ]}
            onChange={(e) => setTargetType(e.target.value as BulkStatusChangeInput['targetType'])}
          />
          <Input
            label="Target IDs (comma separated)"
            value={targetIdsText}
            onChange={(e) => setTargetIdsText(e.target.value)}
            placeholder="id-1, id-2"
          />
          <Input label="Marketplace ID" value={marketplaceId} onChange={(e) => setMarketplaceId(e.target.value)} />
          <Input label="Keyword Filter" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Input label="SKU Filter" value={sku} onChange={(e) => setSku(e.target.value)} />
          <Select
            label="Status"
            value={status}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'paused', label: 'Paused' },
              { value: 'negative', label: 'Negative' },
            ]}
            onChange={(e) => setStatus(e.target.value as BulkStatusChangeInput['status'])}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePreview}>
            Preview
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </div>

        {preview?.items?.length ? (
          <div className="pt-2">
            <div className="text-sm text-text-muted mb-2">Preview ({preview.items.length} items)</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead>New Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.items.map((item) => (
                  <TableRow key={item.keywordId}>
                    <TableCell>{item.keyword}</TableCell>
                    <TableCell>{item.currentStatus || '—'}</TableCell>
                    <TableCell>{item.newStatus || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

