"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import { exportChartCSV, exportChartPDF } from './utils/export'

export interface ChartContainerProps {
  title: string
  subtitle?: string
  exportRows?: Array<Record<string, string | number>>
  children: React.ReactNode
  className?: string
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  exportRows = [],
  children,
  className,
}) => {
  const handleExportCSV = () => exportChartCSV(`${title.toLowerCase().replace(/\s+/g, '-')}.csv`, exportRows)
  const handleExportPDF = () => exportChartPDF(title, exportRows)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

