'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'
import { EmailStatsResponse, ReviewStatsResponse } from '@/services/api/trackingStats.api'

export interface StatsExportButtonProps {
  type: 'email' | 'review'
  data?: EmailStatsResponse | ReviewStatsResponse
  filename?: string
}

/**
 * Export stats data to CSV
 */
function exportToCSV(data: any, filename: string) {
  // Convert data to CSV format
  const rows: string[] = []

  // Add overview stats
  if ('totalSent' in data) {
    rows.push('Metric,Value')
    rows.push(`Total Sent,${data.totalSent}`)
    if ('totalDelivered' in data) {
      rows.push(`Total Delivered,${data.totalDelivered}`)
      rows.push(`Total Opened,${data.totalOpened}`)
      rows.push(`Total Clicked,${data.totalClicked}`)
      rows.push(`Total Bounced,${data.totalBounced}`)
      rows.push(`Open Rate,${data.openRate.toFixed(2)}%`)
      rows.push(`Click Rate,${data.clickRate.toFixed(2)}%`)
      rows.push(`Bounce Rate,${data.bounceRate.toFixed(2)}%`)
    } else {
      rows.push(`Total Received,${data.totalReceived}`)
      rows.push(`Total Positive,${data.totalPositive}`)
      rows.push(`Total Negative,${data.totalNegative}`)
      rows.push(`Response Rate,${data.responseRate.toFixed(2)}%`)
      rows.push(`Positive Rate,${data.positiveRate.toFixed(2)}%`)
      rows.push(`Avg Response Time,${data.averageResponseTime.toFixed(2)} hours`)
    }
    rows.push('')
  }

  // Add by template data
  if (data.byTemplate && data.byTemplate.length > 0) {
    rows.push('Template Statistics')
    if ('openRate' in data.byTemplate[0]) {
      rows.push('Template Name,Sent,Delivered,Opened,Clicked,Bounced,Open Rate,Click Rate')
      data.byTemplate.forEach((template: any) => {
        rows.push(
          `${template.templateName},${template.sent},${template.delivered},${template.opened},${template.clicked},${template.bounced},${template.openRate.toFixed(2)}%,${template.clickRate.toFixed(2)}%`
        )
      })
    } else {
      rows.push('Template Name,Sent,Received,Positive,Negative,Response Rate,Positive Rate')
      data.byTemplate.forEach((template: any) => {
        rows.push(
          `${template.templateName},${template.sent},${template.received},${template.positive},${template.negative},${template.responseRate.toFixed(2)}%,${template.positiveRate.toFixed(2)}%`
        )
      })
    }
    rows.push('')
  }

  // Add by product data (for review stats)
  if (data.byProduct && data.byProduct.length > 0) {
    rows.push('Product Statistics')
    rows.push('Product Title,ASIN,SKU,Sent,Received,Positive,Negative,Response Rate,Positive Rate')
    data.byProduct.forEach((product: any) => {
      rows.push(
        `${product.productTitle},${product.asin || ''},${product.sku || ''},${product.sent},${product.received},${product.positive},${product.negative},${product.responseRate.toFixed(2)}%,${product.positiveRate.toFixed(2)}%`
      )
    })
  }

  // Create CSV content
  const csvContent = rows.join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const StatsExportButton: React.FC<StatsExportButtonProps> = ({
  type,
  data,
  filename,
}) => {
  const handleExport = () => {
    if (!data) return

    const defaultFilename = filename || `${type}-stats-${new Date().toISOString().split('T')[0]}.csv`
    exportToCSV(data, defaultFilename)
  }

  return (
    <Button
      variant="outline"
      size="md"
      onClick={handleExport}
      disabled={!data}
    >
      Export to CSV
    </Button>
  )
}

