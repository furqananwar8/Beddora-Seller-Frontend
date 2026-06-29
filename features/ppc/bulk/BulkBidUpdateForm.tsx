'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { BulkActionResult, BulkBidUpdateInput } from '@/types/ppcBulk.types'
import { formatNumber } from '@/utils/format'

export interface BulkBidUpdateFormProps {
  accountId: string
  onPreview: (payload: BulkBidUpdateInput) => Promise<BulkActionResult | undefined>
  onApply: (payload: BulkBidUpdateInput) => Promise<BulkActionResult | undefined>
}

export const BulkBidUpdateForm: React.FC<BulkBidUpdateFormProps> = ({
  accountId,
  onPreview,
  onApply,
}) => {
  const [targetType, setTargetType] = useState<BulkBidUpdateInput['targetType']>('keyword')
  const [targetIdsText, setTargetIdsText] = useState('')
  const [newBid, setNewBid] = useState(0.5)
  const [minBid, setMinBid] = useState(0.1)
  const [maxBid, setMaxBid] = useState(5)
  const [marketplaceId, setMarketplaceId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [sku, setSku] = useState('')
  const [preview, setPreview] = useState<BulkActionResult | null>(null)

  const targetIds = useMemo(
    () => targetIdsText.split(',').map((value) => value.trim()).filter(Boolean),
    [targetIdsText]
  )

  const basePayload = (): BulkBidUpdateInput => ({
    accountId,
    targetType,
    targetIds: targetIds.length ? targetIds : undefined,
    marketplaceId: marketplaceId || undefined,
    keyword: keyword || undefined,
    sku: sku || undefined,
    newBid,
    minBid,
    maxBid,
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
        <CardTitle>Bulk Bid Update</CardTitle>
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
            onChange={(e) => setTargetType(e.target.value as BulkBidUpdateInput['targetType'])}
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
          <Input label="New Bid" type="number" value={newBid} onChange={(e) => setNewBid(Number(e.target.value))} />
          <Input label="Min Bid" type="number" value={minBid} onChange={(e) => setMinBid(Number(e.target.value))} />
          <Input label="Max Bid" type="number" value={maxBid} onChange={(e) => setMaxBid(Number(e.target.value))} />
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
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-right">Current Bid</TableHead>
                  <TableHead className="text-right">New Bid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.items.map((item) => (
                  <TableRow key={item.keywordId}>
                    <TableCell>{item.keyword}</TableCell>
                    <TableCell className="text-right">
                      {item.currentBid === undefined ? '—' : formatNumber(item.currentBid, 2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.newBid === undefined ? '—' : formatNumber(item.newBid, 2)}
                    </TableCell>
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

