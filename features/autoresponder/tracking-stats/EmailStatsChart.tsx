'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { EmailStatsResponse } from '@/services/api/trackingStats.api'
import { Spinner } from '@/design-system/loaders'

export interface EmailStatsChartProps {
  data?: EmailStatsResponse
  isLoading?: boolean
  error?: any
}

export const EmailStatsChart: React.FC<EmailStatsChartProps> = ({
  data,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Statistics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load email statistics.</div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No data available.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-text-muted mb-1">Total Sent</div>
            <div className="text-2xl font-bold text-text-primary">{data.totalSent}</div>
          </div>
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-text-muted mb-1">Open Rate</div>
            <div className="text-2xl font-bold text-primary-600">
              {data.openRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-text-muted mb-1">Click Rate</div>
            <div className="text-2xl font-bold text-primary-600">
              {data.clickRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-text-muted mb-1">Bounce Rate</div>
            <div className="text-2xl font-bold text-warning-600">
              {data.bounceRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm font-medium text-text-primary mb-3">Delivery Metrics</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Delivered</span>
                <span className="font-medium">{data.totalDelivered}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Delivery Rate</span>
                <span className="font-medium">{data.deliveryRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Opened</span>
                <span className="font-medium">{data.totalOpened}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Clicked</span>
                <span className="font-medium">{data.totalClicked}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm font-medium text-text-primary mb-3">Issues</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Bounced</span>
                <span className="font-medium text-warning-600">{data.totalBounced}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Failed</span>
                <span className="font-medium text-danger-600">{data.totalFailed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* By Template */}
        {data.byTemplate && data.byTemplate.length > 0 && (
          <div className="mt-6">
            <div className="text-sm font-medium text-text-primary mb-3">Stats by Template</div>
            <div className="space-y-3">
              {data.byTemplate.map((template) => (
                <div key={template.templateId} className="bg-surface rounded-lg p-4">
                  <div className="font-medium text-text-primary mb-2">{template.templateName}</div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-text-muted">Sent</div>
                      <div className="font-medium">{template.sent}</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Open Rate</div>
                      <div className="font-medium">{template.openRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Click Rate</div>
                      <div className="font-medium">{template.clickRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Opened</div>
                      <div className="font-medium">{template.opened}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

