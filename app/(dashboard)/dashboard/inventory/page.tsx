'use client'

import React, { useEffect } from 'react'
import { Container, PageHeader } from '@/components/layout'
import { Input, Select } from '@/design-system/inputs'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setInventoryFilters } from '@/store/inventoryStock.slice'
import { setForecastFilters } from '@/store/inventoryForecast.slice'
import { setInventoryKpiFilters } from '@/store/inventoryKPI.slice'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import {
  InventoryCard,
  InventoryTable,
  LowStockAlertList,
  useFetchInventory,
  useFetchLowStockAlerts,
} from '@/features/inventory/stock'
import {
  ForecastCard,
  ForecastTable,
  RestockAlertList,
  useFetchForecast,
  useFetchRestockAlerts,
} from '@/features/inventory/forecast'
import {
  InventoryKPICard,
  InventoryKPITable,
  BatchAssignmentTable,
  KPIAlerts,
  useFetchInventoryKPIs,
} from '@/features/inventory/kpis'

export default function InventoryDashboardPage() {
  const dispatch = useAppDispatch()
  const filters = useAppSelector((state) => state.inventoryStock.filters)
  const forecastFilters = useAppSelector((state) => state.inventoryForecast.filters)
  const kpiFilters = useAppSelector((state) => state.inventoryKpi.filters)
  const { data: accounts } = useGetAccountsQuery()

  useEffect(() => {
    if (!filters.accountId && accounts?.length) {
      dispatch(setInventoryFilters({ accountId: accounts[0].id }))
    }
  }, [accounts, dispatch, filters.accountId])

  useEffect(() => {
    if (!forecastFilters.accountId && accounts?.length) {
      dispatch(setForecastFilters({ accountId: accounts[0].id }))
    }
  }, [accounts, dispatch, forecastFilters.accountId])

  useEffect(() => {
    if (!kpiFilters.accountId && accounts?.length) {
      dispatch(setInventoryKpiFilters({ accountId: accounts[0].id }))
    }
  }, [accounts, dispatch, kpiFilters.accountId])

  const effectiveFilters = {
    ...filters,
    accountId: filters.accountId || '',
  }

  const effectiveForecastFilters = {
    ...forecastFilters,
    accountId: forecastFilters.accountId || '',
    marketplaceId: effectiveFilters.marketplaceId,
    sku: effectiveFilters.sku,
  }

  const effectiveKpiFilters = {
    ...kpiFilters,
    accountId: kpiFilters.accountId || '',
    marketplaceId: effectiveFilters.marketplaceId,
    sku: effectiveFilters.sku,
  }

  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    error: inventoryError,
  } = useFetchInventory(effectiveFilters, {
    skip: !effectiveFilters.accountId,
    pollingInterval: 30000,
    refetchOnFocus: true,
  })

  const {
    data: alertsData,
    isLoading: alertsLoading,
    error: alertsError,
  } = useFetchLowStockAlerts(
    {
      accountId: effectiveFilters.accountId,
      marketplaceId: effectiveFilters.marketplaceId,
      sku: effectiveFilters.sku,
    },
    {
      skip: !effectiveFilters.accountId,
      pollingInterval: 30000,
      refetchOnFocus: true,
    }
  )

  const {
    data: forecastData,
    isLoading: forecastLoading,
    error: forecastError,
  } = useFetchForecast(effectiveForecastFilters, {
    skip: !effectiveForecastFilters.accountId,
    pollingInterval: 30000,
    refetchOnFocus: true,
  })

  const {
    data: restockAlertsData,
    isLoading: restockAlertsLoading,
    error: restockAlertsError,
  } = useFetchRestockAlerts(
    {
      accountId: effectiveForecastFilters.accountId,
      marketplaceId: effectiveForecastFilters.marketplaceId,
      sku: effectiveForecastFilters.sku,
    },
    {
      skip: !effectiveForecastFilters.accountId,
      pollingInterval: 30000,
      refetchOnFocus: true,
    }
  )

  const {
    data: kpiData,
    isLoading: kpiLoading,
    error: kpiError,
  } = useFetchInventoryKPIs(effectiveKpiFilters, {
    skip: !effectiveKpiFilters.accountId,
    pollingInterval: 30000,
    refetchOnFocus: true,
  })

  const selectedKpi = effectiveKpiFilters.sku
    ? kpiData?.data.find((item) => item.sku === effectiveKpiFilters.sku)
    : kpiData?.data[0]

  return (
    <Container>
      <PageHeader title="Inventory" description="Track real-time stock levels by SKU and marketplace." />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Search SKU"
            placeholder="Enter SKU"
            value={filters.sku || ''}
            onChange={(e) => {
              dispatch(setInventoryFilters({ sku: e.target.value, page: 1 }))
              dispatch(setForecastFilters({ sku: e.target.value }))
              dispatch(setInventoryKpiFilters({ sku: e.target.value }))
            }}
          />
          <Input
            label="Marketplace ID"
            placeholder="Marketplace ID"
            value={filters.marketplaceId || ''}
            onChange={(e) => {
              dispatch(setInventoryFilters({ marketplaceId: e.target.value, page: 1 }))
              dispatch(setForecastFilters({ marketplaceId: e.target.value }))
              dispatch(setInventoryKpiFilters({ marketplaceId: e.target.value }))
            }}
          />
          <Select
            label="Stock Status"
            options={[
              { label: 'All', value: '' },
              { label: 'Low', value: 'low' },
              { label: 'Normal', value: 'normal' },
              { label: 'Out of Stock', value: 'out_of_stock' },
            ]}
            value={filters.status || ''}
            onChange={(e) =>
              dispatch(
                setInventoryFilters({
                  status: e.target.value ? (e.target.value as any) : undefined,
                  page: 1,
                })
              )
            }
          />
          <Select
            label="KPI Status"
            options={[
              { label: 'All', value: '' },
              { label: 'Low', value: 'low' },
              { label: 'Normal', value: 'normal' },
              { label: 'Overstock', value: 'overstock' },
            ]}
            value={kpiFilters.status || ''}
            onChange={(e) =>
              dispatch(
                setInventoryKpiFilters({
                  status: e.target.value ? (e.target.value as any) : undefined,
                })
              )
            }
          />
        </div>

        <InventoryCard summary={inventoryData?.summary} isLoading={inventoryLoading} error={inventoryError} />

        <ForecastCard data={forecastData} isLoading={forecastLoading} error={forecastError} />

        <InventoryKPICard data={kpiData} isLoading={kpiLoading} error={kpiError} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <InventoryTable items={inventoryData?.data} isLoading={inventoryLoading} error={inventoryError} />
          </div>
          <LowStockAlertList
            alerts={alertsData?.alerts}
            isLoading={alertsLoading}
            error={alertsError}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ForecastTable items={forecastData?.data} isLoading={forecastLoading} error={forecastError} />
          </div>
          <RestockAlertList
            alerts={restockAlertsData?.alerts}
            isLoading={restockAlertsLoading}
            error={restockAlertsError}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <InventoryKPITable items={kpiData?.data} isLoading={kpiLoading} error={kpiError} />
          </div>
          <KPIAlerts items={kpiData?.data} isLoading={kpiLoading} error={kpiError} />
        </div>

        <BatchAssignmentTable
          assignments={selectedKpi?.fifoBatchAssignments}
          isLoading={kpiLoading}
          error={kpiError}
        />
      </div>
    </Container>
  )
}

