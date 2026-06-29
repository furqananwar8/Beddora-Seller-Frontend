'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { ReviewStatsResponse } from '@/services/api/trackingStats.api'
import { Spinner } from '@/design-system/loaders'

export interface ReviewStatsChartProps {
  data?: ReviewStatsResponse
  isLoading?: boolean
  error?: any
}

export const ReviewStatsChart: React.FC<ReviewStatsChartProps> = ({
  data,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review Statistics</CardTitle>
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
          <CardTitle>Review Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load review statistics.</div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review Statistics</CardTitle>
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
        <CardTitle>Review Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-text-muted mb-1">Total Sent</div>
            <div className="text-2xl font-bold text-text-primary">{data.totalSent}</div>
          </div>
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-text-muted mb-1">Response Rate</div>
            <div className="text-2xl font-bold text-primary-600">
              {data.responseRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-text-muted mb-1">Positive Rate</div>
            <div className="text-2xl font-bold text-success-600">
              {data.positiveRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-text-muted mb-1">Avg Response Time</div>
            <div className="text-2xl font-bold text-text-primary">
              {data.averageResponseTime.toFixed(1)}h
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm font-medium text-text-primary mb-3">Review Metrics</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Reviews Received</span>
                <span className="font-medium">{data.totalReceived}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Positive Reviews</span>
                <span className="font-medium text-success-600">{data.totalPositive}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Negative Reviews</span>
                <span className="font-medium text-danger-600">{data.totalNegative}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm font-medium text-text-primary mb-3">Performance</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Response Rate</span>
                <span className="font-medium">{data.responseRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Positive Rate</span>
                <span className="font-medium">{data.positiveRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Avg Response Time</span>
                <span className="font-medium">{data.averageResponseTime.toFixed(1)} hours</span>
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
                      <div className="text-text-muted">Received</div>
                      <div className="font-medium">{template.received}</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Response Rate</div>
                      <div className="font-medium">{template.responseRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Positive Rate</div>
                      <div className="font-medium">{template.positiveRate.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By Product */}
        {data.byProduct && data.byProduct.length > 0 && (
          <div className="mt-6">
            <div className="text-sm font-medium text-text-primary mb-3">Stats by Product</div>
            <div className="space-y-3">
              {data.byProduct.map((product) => (
                <div key={product.productId} className="bg-surface rounded-lg p-4">
                  <div className="font-medium text-text-primary mb-2">{product.productTitle}</div>
                  <div className="text-xs text-text-muted mb-2">
                    {product.asin && `ASIN: ${product.asin}`}
                    {product.sku && ` | SKU: ${product.sku}`}
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-text-muted">Sent</div>
                      <div className="font-medium">{product.sent}</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Received</div>
                      <div className="font-medium">{product.received}</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Response Rate</div>
                      <div className="font-medium">{product.responseRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Positive Rate</div>
                      <div className="font-medium">{product.positiveRate.toFixed(1)}%</div>
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

