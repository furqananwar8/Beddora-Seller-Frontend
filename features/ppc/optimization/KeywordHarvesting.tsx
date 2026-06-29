'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Badge } from '@/design-system/badges'
import { KeywordHarvestSuggestion } from '@/types/ppcOptimization.types'

export interface KeywordHarvestingProps {
  suggestions?: KeywordHarvestSuggestion[]
}

const actionVariant = (action: KeywordHarvestSuggestion['action']) => {
  if (action === 'positive') return 'success'
  if (action === 'negative') return 'error'
  return 'warning'
}

export const KeywordHarvesting: React.FC<KeywordHarvestingProps> = ({ suggestions }) => {
  if (!suggestions || suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keyword Harvesting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No keyword harvesting suggestions.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keyword Harvesting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((item, index) => (
          <div key={`${item.keyword}-${index}`} className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium">{item.keyword}</div>
              <div className="text-xs text-text-muted">{item.reason}</div>
            </div>
            <Badge variant={actionVariant(item.action)}>{item.action}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

