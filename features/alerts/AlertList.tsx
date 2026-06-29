'use client'

import React from 'react'
import { Card, CardContent } from '@/design-system/cards'
import { Badge } from '@/design-system/badges'

/**
 * AlertList component
 * 
 * Feature component for displaying alerts
 * Connect to alerts API here (create alerts.api.ts)
 */
export const AlertList: React.FC = () => {
  // Example data structure
  const alerts = [
    { id: '1', message: 'Low stock alert', type: 'warning', timestamp: new Date() },
    { id: '2', message: 'Campaign paused', type: 'error', timestamp: new Date() },
  ]

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'primary'> = {
      warning: 'warning',
      error: 'error',
      success: 'success',
      info: 'primary',
    }
    return <Badge variant={variants[type] || 'secondary'}>{type}</Badge>
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <Card key={alert.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p>{alert.message}</p>
              {getTypeBadge(alert.type)}
            </div>
            <p className="text-xs text-secondary-500 mt-2">
              {alert.timestamp.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

