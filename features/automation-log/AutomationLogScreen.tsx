'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'

type LogTab = 'completed' | 'pending'

interface AutomationLogEntry {
  id: string
  date: string
  campaign: string
  adGroup: string
  keyword: string
  changeType: string
  bidRecommendationStrategy: string
  comment: string
}

export const AutomationLogScreen = React.memo(() => {
  const [activeTab, setActiveTab] = useState<LogTab>('completed')
  const [searchTerm, setSearchTerm] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [dateRange, setDateRange] = useState('27 December 2025 - 27 January 2026')
  const [changesFilter, setChangesFilter] = useState('all')

  // Sample data
  const [logEntries] = useState<AutomationLogEntry[]>([
    {
      id: '1',
      date: '2026-01-27',
      campaign: 'Winter Sale 2026',
      adGroup: 'Electronics - High Performers',
      keyword: 'wireless headphones',
      changeType: 'Bid increase',
      bidRecommendationStrategy: 'Maximize conversions',
      comment: 'Increased bid due to high conversion rate and low ACOS',
    },
    {
      id: '2',
      date: '2026-01-27',
      campaign: 'Holiday Campaign',
      adGroup: 'Home & Kitchen',
      keyword: 'kitchen gadgets',
      changeType: 'Bid decrease',
      bidRecommendationStrategy: 'Target ACOS',
      comment: 'Reduced bid - ACOS above target threshold',
    },
    {
      id: '3',
      date: '2026-01-26',
      campaign: 'Brand Defense',
      adGroup: 'Brand Keywords',
      keyword: 'beddora products',
      changeType: 'Bid increase',
      bidRecommendationStrategy: 'Competitive bidding',
      comment: 'Protecting brand position from competitors',
    },
    {
      id: '4',
      date: '2026-01-26',
      campaign: 'Winter Sale 2026',
      adGroup: 'Fashion - Bestsellers',
      keyword: 'winter jackets',
      changeType: 'Pause keyword',
      bidRecommendationStrategy: 'Budget optimization',
      comment: 'Paused - zero conversions in last 30 days',
    },
    {
      id: '5',
      date: '2026-01-25',
      campaign: 'Q1 Clearance',
      adGroup: 'Sports Equipment',
      keyword: 'yoga mats',
      changeType: 'Bid increase',
      bidRecommendationStrategy: 'Maximize clicks',
      comment: 'Strong CTR and improving conversion rate',
    },
    {
      id: '6',
      date: '2026-01-25',
      campaign: 'Holiday Campaign',
      adGroup: 'Electronics - Budget',
      keyword: 'bluetooth speakers',
      changeType: 'Bid decrease',
      bidRecommendationStrategy: 'Target ROAS',
      comment: 'ROAS below target - adjusting bid down',
    },
    {
      id: '7',
      date: '2026-01-24',
      campaign: 'New Product Launch',
      adGroup: 'Launch Products',
      keyword: 'smart home devices',
      changeType: 'Bid increase',
      bidRecommendationStrategy: 'Aggressive growth',
      comment: 'New product performing well - scaling up',
    },
    {
      id: '8',
      date: '2026-01-24',
      campaign: 'Winter Sale 2026',
      adGroup: 'Home Decor',
      keyword: 'wall art prints',
      changeType: 'Bid increase',
      bidRecommendationStrategy: 'Target ACOS',
      comment: 'Low ACOS with room for increased spend',
    },
    {
      id: '9',
      date: '2026-01-23',
      campaign: 'Brand Defense',
      adGroup: 'Competitor Terms',
      keyword: 'competitor brand name',
      changeType: 'Bid decrease',
      bidRecommendationStrategy: 'Cost control',
      comment: 'High CPC with low conversion - reducing exposure',
    },
    {
      id: '10',
      date: '2026-01-23',
      campaign: 'Q1 Clearance',
      adGroup: 'Pet Supplies',
      keyword: 'dog toys',
      changeType: 'Bid increase',
      bidRecommendationStrategy: 'Seasonal boost',
      comment: 'Seasonal demand increase detected',
    },
    {
      id: '11',
      date: '2026-01-22',
      campaign: 'Holiday Campaign',
      adGroup: 'Beauty Products',
      keyword: 'skincare routine',
      changeType: 'Pause keyword',
      bidRecommendationStrategy: 'Budget reallocation',
      comment: 'Poor performance - reallocating budget to better keywords',
    },
    {
      id: '12',
      date: '2026-01-22',
      campaign: 'Winter Sale 2026',
      adGroup: 'Electronics - Mid Range',
      keyword: 'wireless chargers',
      changeType: 'Bid increase',
      bidRecommendationStrategy: 'Maximize profit',
      comment: 'Excellent margin and conversion rate',
    },
  ])

  const handleExport = () => {
    console.log('Export log data')
  }

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Automation Log</h1>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 mb-6">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              type="text"
              placeholder="Search by keyword"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        {/* Campaign Filter */}
        <Select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All campaigns' },
            { value: 'campaign-1', label: 'Campaign 1' },
            { value: 'campaign-2', label: 'Campaign 2' },
          ]}
          className="min-w-[160px]"
        />

        {/* Date Range */}
        <div className="relative">
          <button className="flex items-center gap-2 px-3 py-2 border border-border bg-surface hover:bg-surface-secondary transition-colors whitespace-nowrap">
            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm">{dateRange}</span>
          </button>
        </div>

        {/* Changes Filter */}
        <Select
          value={changesFilter}
          onChange={(e) => setChangesFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All changes' },
            { value: 'bid-increase', label: 'Bid increase' },
            { value: 'bid-decrease', label: 'Bid decrease' },
            { value: 'pause-keyword', label: 'Pause keyword' },
          ]}
          className="min-w-[160px]"
        />

        {/* Filter Button */}
        <button className="flex items-center gap-2 px-4 py-2 border border-border bg-surface hover:bg-surface-secondary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="text-sm">Filter</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-3 px-1 border-b-2 transition-colors text-sm ${
              activeTab === 'completed'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 px-1 border-b-2 transition-colors text-sm ${
              activeTab === 'pending'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Pending
          </button>
        </div>
      </div>

      {/* Content Area */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    Date
                    <button className="ml-1 inline-block">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Campaign</TableHead>
                  <TableHead className="whitespace-nowrap">Ad group</TableHead>
                  <TableHead className="whitespace-nowrap">Keyword</TableHead>
                  <TableHead className="whitespace-nowrap">Change type</TableHead>
                  <TableHead className="whitespace-nowrap">Bid recommendation strategy</TableHead>
                  <TableHead className="whitespace-nowrap">Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="text-text-muted text-sm">No data available</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                      <TableCell>{entry.campaign}</TableCell>
                      <TableCell>{entry.adGroup}</TableCell>
                      <TableCell>{entry.keyword}</TableCell>
                      <TableCell>{entry.changeType}</TableCell>
                      <TableCell>{entry.bidRecommendationStrategy}</TableCell>
                      <TableCell>{entry.comment}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <div className="mt-6">
        <Button variant="secondary" onClick={handleExport}>
          <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export
        </Button>
      </div>
    </Container>
  )
})
