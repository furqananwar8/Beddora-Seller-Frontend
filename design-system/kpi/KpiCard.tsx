'use client'

import React from 'react'
import { Card, CardContent } from '@/design-system/cards'
import { cn } from '@/utils/cn'

export interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  iconClassName?: string
  className?: string
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconClassName,
  className,
}) => {
  return (
    <Card className={cn('h-full', className)}>
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-text-muted">{title}</p>
            <div className="mt-2 text-metric">{value}</div>
            {subtitle && <p className="mt-1 text-xs text-text-muted">{subtitle}</p>}
          </div>
          {icon && <div className={cn('text-primary-600', iconClassName)}>{icon}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

