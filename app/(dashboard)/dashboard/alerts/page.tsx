'use client'

import React, { useState } from 'react'
import { Container, PageHeader } from '@/components/layout'
import { Input, Select } from '@/design-system/inputs'
import { Tabs } from '@/design-system/tabs'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setListingAlertsFilters } from '@/store/listingAlerts.slice'
import { setBuyBoxAlertsFilters } from '@/store/buyBoxAlerts.slice'
import { setFeeChangeAlertsFilters } from '@/store/feeChangeAlerts.slice'
import { setFeedbackAlertsFilters } from '@/store/feedbackAlerts.slice'
import { useFetchListingAlerts, useMarkAlertRead, useMarkAlertResolved } from '@/features/alerts/listing-change/hooks'
import { ListingAlertCard, ListingAlertDetails, ListingAlertTable } from '@/features/alerts/listing-change'
import { useFetchBuyBoxAlerts, useMarkBuyBoxAlertRead, useMarkBuyBoxAlertResolved } from '@/features/alerts/buy-box/hooks'
import { BuyBoxAlertCard, BuyBoxAlertDetails, BuyBoxAlertTable } from '@/features/alerts/buy-box'
import { AlertList } from '@/features/alerts/AlertList'
import { ListingAlertItem } from '@/types/listingAlerts.types'
import { BuyBoxAlertItem } from '@/types/buyBoxAlerts.types'
import { useFetchFeeChangeAlerts, useMarkFeeChangeAlertRead, useMarkFeeChangeAlertResolved } from '@/features/alerts/fee-change/hooks'
import { FeeChangeAlertCard, FeeChangeAlertDetails, FeeChangeAlertTable } from '@/features/alerts/fee-change'
import { FeeChangeAlertItem } from '@/types/feeChangeAlerts.types'
import { useFetchFeedbackAlerts, useMarkFeedbackAlertRead, useMarkFeedbackAlertResolved } from '@/features/alerts/feedback-review/hooks'
import { FeedbackAlertCard, FeedbackAlertDetails, FeedbackAlertTable } from '@/features/alerts/feedback-review'
import { FeedbackAlertItem } from '@/types/feedbackAlerts.types'

const alertTabs = [
  { id: 'listing', label: 'Listing Changes' },
  { id: 'buybox', label: 'Buy Box' },
  { id: 'fees', label: 'Fee Changes' },
  { id: 'feedback', label: 'Feedback & Reviews' },
  { id: 'general', label: 'All Alerts' },
]

export default function AlertsDashboardPage() {
  const dispatch = useAppDispatch()
  const filters = useAppSelector((state) => state.listingAlerts.filters)
  const buyBoxFilters = useAppSelector((state) => state.buyBoxAlerts.filters)
  const feeFilters = useAppSelector((state) => state.feeChangeAlerts.filters)
  const feedbackFilters = useAppSelector((state) => state.feedbackAlerts.filters)
  const [activeTab, setActiveTab] = useState('listing')
  const [selectedAlert, setSelectedAlert] = useState<ListingAlertItem | null>(null)
  const [selectedBuyBoxAlert, setSelectedBuyBoxAlert] = useState<BuyBoxAlertItem | null>(null)
  const [selectedFeeAlert, setSelectedFeeAlert] = useState<FeeChangeAlertItem | null>(null)
  const [selectedFeedbackAlert, setSelectedFeedbackAlert] = useState<FeedbackAlertItem | null>(null)

  const { data, isLoading, error } = useFetchListingAlerts(filters)
  const [markRead] = useMarkAlertRead()
  const [markResolved] = useMarkAlertResolved()

  const { data: buyBoxData, isLoading: buyBoxLoading, error: buyBoxError } =
    useFetchBuyBoxAlerts(buyBoxFilters)
  const [markBuyBoxRead] = useMarkBuyBoxAlertRead()
  const [markBuyBoxResolved] = useMarkBuyBoxAlertResolved()

  const { data: feeData, isLoading: feeLoading, error: feeError } =
    useFetchFeeChangeAlerts(feeFilters)
  const [markFeeRead] = useMarkFeeChangeAlertRead()
  const [markFeeResolved] = useMarkFeeChangeAlertResolved()

  const { data: feedbackData, isLoading: feedbackLoading, error: feedbackError } =
    useFetchFeedbackAlerts(feedbackFilters)
  const [markFeedbackRead] = useMarkFeedbackAlertRead()
  const [markFeedbackResolved] = useMarkFeedbackAlertResolved()

  return (
    <Container>
      <PageHeader title="Alerts" description="Monitor business alerts and notifications." />

      <div className="space-y-6">
        <Tabs items={alertTabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'listing' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                label="Marketplace ID"
                value={filters.marketplaceId || ''}
                onChange={(e) =>
                  dispatch(setListingAlertsFilters({ marketplaceId: e.target.value || undefined }))
                }
              />
              <Input
                label="ASIN"
                value={filters.asin || ''}
                onChange={(e) => dispatch(setListingAlertsFilters({ asin: e.target.value || undefined }))}
              />
              <Input
                label="SKU"
                value={filters.sku || ''}
                onChange={(e) => dispatch(setListingAlertsFilters({ sku: e.target.value || undefined }))}
              />
              <Select
                label="Status"
                options={[
                  { label: 'All', value: '' },
                  { label: 'Unread', value: 'unread' },
                  { label: 'Read', value: 'read' },
                  { label: 'Resolved', value: 'resolved' },
                ]}
                value={filters.status || ''}
                onChange={(e) =>
                  dispatch(setListingAlertsFilters({ status: (e.target.value as any) || undefined }))
                }
              />
            </div>

            <ListingAlertCard items={data?.data} />

            <ListingAlertTable
              items={data?.data}
              isLoading={isLoading}
              error={error}
              onSelect={(alert) => setSelectedAlert(alert)}
              onMarkRead={(id) => markRead({ id })}
              onResolve={(id) => markResolved({ id })}
            />

            <ListingAlertDetails alert={selectedAlert} />
          </>
        ) : activeTab === 'buybox' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                label="Marketplace ID"
                value={buyBoxFilters.marketplaceId || ''}
                onChange={(e) =>
                  dispatch(setBuyBoxAlertsFilters({ marketplaceId: e.target.value || undefined }))
                }
              />
              <Input
                label="ASIN"
                value={buyBoxFilters.asin || ''}
                onChange={(e) => dispatch(setBuyBoxAlertsFilters({ asin: e.target.value || undefined }))}
              />
              <Input
                label="SKU"
                value={buyBoxFilters.sku || ''}
                onChange={(e) => dispatch(setBuyBoxAlertsFilters({ sku: e.target.value || undefined }))}
              />
              <Select
                label="Status"
                options={[
                  { label: 'All', value: '' },
                  { label: 'Unread', value: 'unread' },
                  { label: 'Read', value: 'read' },
                  { label: 'Resolved', value: 'resolved' },
                ]}
                value={buyBoxFilters.status || ''}
                onChange={(e) =>
                  dispatch(setBuyBoxAlertsFilters({ status: (e.target.value as any) || undefined }))
                }
              />
            </div>

            <BuyBoxAlertCard items={buyBoxData?.data} />

            <BuyBoxAlertTable
              items={buyBoxData?.data}
              isLoading={buyBoxLoading}
              error={buyBoxError}
              onSelect={(alert) => setSelectedBuyBoxAlert(alert)}
              onMarkRead={(id) => markBuyBoxRead({ id })}
              onResolve={(id) => markBuyBoxResolved({ id })}
            />

            <BuyBoxAlertDetails alert={selectedBuyBoxAlert} />
          </>
        ) : activeTab === 'fees' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                label="Marketplace ID"
                value={feeFilters.marketplaceId || ''}
                onChange={(e) =>
                  dispatch(setFeeChangeAlertsFilters({ marketplaceId: e.target.value || undefined }))
                }
              />
              <Input
                label="SKU"
                value={feeFilters.sku || ''}
                onChange={(e) => dispatch(setFeeChangeAlertsFilters({ sku: e.target.value || undefined }))}
              />
              <Input
                label="Fee Type"
                value={feeFilters.feeType || ''}
                onChange={(e) => dispatch(setFeeChangeAlertsFilters({ feeType: e.target.value || undefined }))}
              />
              <Select
                label="Status"
                options={[
                  { label: 'All', value: '' },
                  { label: 'Unread', value: 'unread' },
                  { label: 'Read', value: 'read' },
                  { label: 'Resolved', value: 'resolved' },
                ]}
                value={feeFilters.status || ''}
                onChange={(e) =>
                  dispatch(setFeeChangeAlertsFilters({ status: (e.target.value as any) || undefined }))
                }
              />
            </div>

            <FeeChangeAlertCard items={feeData?.data} />

            <FeeChangeAlertTable
              items={feeData?.data}
              isLoading={feeLoading}
              error={feeError}
              onSelect={(alert) => setSelectedFeeAlert(alert)}
              onMarkRead={(id) => markFeeRead({ id })}
              onResolve={(id) => markFeeResolved({ id })}
            />

            <FeeChangeAlertDetails alert={selectedFeeAlert} />
          </>
        ) : activeTab === 'feedback' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                label="Marketplace ID"
                value={feedbackFilters.marketplaceId || ''}
                onChange={(e) =>
                  dispatch(setFeedbackAlertsFilters({ marketplaceId: e.target.value || undefined }))
                }
              />
              <Input
                label="ASIN"
                value={feedbackFilters.asin || ''}
                onChange={(e) => dispatch(setFeedbackAlertsFilters({ asin: e.target.value || undefined }))}
              />
              <Input
                label="SKU"
                value={feedbackFilters.sku || ''}
                onChange={(e) => dispatch(setFeedbackAlertsFilters({ sku: e.target.value || undefined }))}
              />
              <Input
                label="Rating Threshold"
                type="number"
                value={feedbackFilters.rating ?? ''}
                onChange={(e) =>
                  dispatch(setFeedbackAlertsFilters({ rating: e.target.value ? Number(e.target.value) : undefined }))
                }
              />
              <Select
                label="Status"
                options={[
                  { label: 'All', value: '' },
                  { label: 'Unread', value: 'unread' },
                  { label: 'Read', value: 'read' },
                  { label: 'Resolved', value: 'resolved' },
                ]}
                value={feedbackFilters.status || ''}
                onChange={(e) =>
                  dispatch(setFeedbackAlertsFilters({ status: (e.target.value as any) || undefined }))
                }
              />
            </div>

            <FeedbackAlertCard items={feedbackData?.data} />

            <FeedbackAlertTable
              items={feedbackData?.data}
              isLoading={feedbackLoading}
              error={feedbackError}
              onSelect={(alert) => setSelectedFeedbackAlert(alert)}
              onMarkRead={(id) => markFeedbackRead({ id })}
              onResolve={(id) => markFeedbackResolved({ id })}
            />

            <FeedbackAlertDetails alert={selectedFeedbackAlert} />
          </>
        ) : (
          <AlertList />
        )}
      </div>
    </Container>
  )
}

