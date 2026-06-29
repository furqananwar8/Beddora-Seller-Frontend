'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { BulkActionResult, BulkApplyRecommendationsInput } from '@/types/ppcBulk.types'
import { formatNumber } from '@/utils/format'

export interface ApplyRecommendationsCardProps {
  accountId: string
  onPreview: (payload: BulkApplyRecommendationsInput) => Promise<BulkActionResult | undefined>
  onApply: (payload: BulkApplyRecommendationsInput) => Promise<BulkActionResult | undefined>
}

export const ApplyRecommendationsCard: React.FC<ApplyRecommendationsCardProps> = ({
  accountId,
  onPreview,
  onApply,
}) => {
  const [minBid, setMinBid] = useState(0.1)
  const [maxBid, setMaxBid] = useState(5)
  const [preview, setPreview] = useState<BulkActionResult | null>(null)

  const handlePreview = async () => {
    const result = await onPreview({ accountId, minBid, maxBid, preview: true })
    if (result) setPreview(result)
  }

  const handleApply = async () => {
    const result = await onApply({ accountId, minBid, maxBid, preview: false })
    if (result) setPreview(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <TableHead className="text-right">Suggested Bid</TableHead>
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

