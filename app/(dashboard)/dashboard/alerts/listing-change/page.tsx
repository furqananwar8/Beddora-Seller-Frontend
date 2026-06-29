'use client'

import React, { useState } from 'react'
import { Container, PageHeader } from '@/components/layout'
import { Input, Select } from '@/design-system/inputs'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setListingAlertsFilters } from '@/store/listingAlerts.slice'
import { useFetchListingAlerts, useMarkAlertRead, useMarkAlertResolved } from '@/features/alerts/listing-change/hooks'
import { ListingAlertCard, ListingAlertDetails, ListingAlertTable } from '@/features/alerts/listing-change'
import { ListingAlertItem } from '@/types/listingAlerts.types'

export default function ListingChangeAlertsPage() {
  const dispatch = useAppDispatch()
  const filters = useAppSelector((state) => state.listingAlerts.filters)
  const [selectedAlert, setSelectedAlert] = useState<ListingAlertItem | null>(null)

  const { data, isLoading, error } = useFetchListingAlerts(filters)
  const [markRead] = useMarkAlertRead()
  const [markResolved] = useMarkAlertResolved()

  return (
    <Container>
      <PageHeader
        title="Listing Change Alerts"
        description="Track Amazon listing changes and resolve alerts."
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Marketplace ID"
            value={filters.marketplaceId || ''}
            onChange={(e) => dispatch(setListingAlertsFilters({ marketplaceId: e.target.value || undefined }))}
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
            onChange={(e) => dispatch(setListingAlertsFilters({ status: (e.target.value as any) || undefined }))}
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
      </div>
    </Container>
  )
}

