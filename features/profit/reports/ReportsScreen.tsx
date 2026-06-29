'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'

interface Report {
  id: string
  title: string
  description: string
  hasDetailedBreakdown?: boolean
}

const reports: Report[] = [
  {
    id: 'dashboard-by-day',
    title: 'Dashboard by day',
    description: 'Contains all the data from the "More" menu (on the Dashboard page), broken down by days.',
  },
  {
    id: 'dashboard-by-month',
    title: 'Dashboard by month',
    description: 'Contains all the data from the "More" menu (on the Dashboard page), broken down by months.',
  },
  {
    id: 'dashboard-by-product',
    title: 'Dashboard by product',
    description: 'Contains all the data from the "More" menu (on the Dashboard page), broken down by days and products.',
  },
  {
    id: 'orders',
    title: 'Orders',
    description: 'Contains your orders, with information about products, units, coupon codes, etc.',
  },
  {
    id: 'sales-by-product-month',
    title: 'Sales by product/month',
    description:
      'Sales data, broken down by months and products. Analyze the sales dynamic, quickly identify trends to react on time on products, which need your attention',
  },
  {
    id: 'advertising-performance',
    title: 'Advertising Performance Report',
    description:
      'The report analyzes the effectiveness of a company\'s advertising campaigns, and contains adverstising performance parameters, such as: Conversion Rate, CPC, TACOS, ROAS, PPC ACOS etc.',
  },
  {
    id: 'repeat-customers',
    title: 'Repeat customers (by brand)',
    description:
      'The report shows the share of orders by repeat customers. Repeat customer is a customer, who ordered the same brand more than once within the selected period.',
  },
  {
    id: 'stock-history',
    title: 'Stock history report',
    description: 'The report shows the inventory level of stock on a specified date by product and marketplace.',
  },
  {
    id: 'cost-of-goods',
    title: 'Cost of Goods Sold',
    description: 'The report shows the cost of the goods recorded in the account as of the current date.',
    hasDetailedBreakdown: true,
  },
]

export const ReportsScreen: React.FC = () => {
  const [expandedReport, setExpandedReport] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('26/01/2026')
  const [dateTo, setDateTo] = useState('27/01/2026')
  const [fileFormat, setFileFormat] = useState<'excel' | 'csv'>('excel')
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false)
  const [showFromCalendar, setShowFromCalendar] = useState(false)
  const [showToCalendar, setShowToCalendar] = useState(false)

  const handleReportClick = (reportId: string) => {
    setExpandedReport(expandedReport === reportId ? null : reportId)
  }

  const handleDownload = () => {
    console.log('Downloading report...', {
      reportId: expandedReport,
      dateFrom,
      dateTo,
      fileFormat,
      showDetailedBreakdown,
    })
  }

  const handleBack = () => {
    setExpandedReport(null)
  }

  const currentReport = reports.find((r) => r.id === expandedReport)

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Reports</h1>
      </div>

      {!expandedReport ? (
        /* Reports List */
        <div className="space-y-0">
          {reports.map((report) => (
            <div
              key={report.id}
              onClick={() => handleReportClick(report.id)}
              className="border-b border-border py-4 cursor-pointer hover:bg-surface-secondary transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary mb-1">{report.title}</h3>
                  <p className="text-xs text-text-muted">{report.description}</p>
                </div>
                <svg
                  className="w-5 h-5 text-text-muted flex-shrink-0 group-hover:text-text-primary transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Report Details with Date Picker */
        <div>
          {/* Back Button and Title */}
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-text-primary hover:text-text-secondary transition-colors mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-text-primary mb-2">{currentReport?.title}</h2>
            <p className="text-sm text-text-muted">{currentReport?.description}</p>
          </div>

          <Card>
            <CardContent className="p-6">
              {/* Date Range Picker */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* From Date */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">From</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      onClick={() => {
                        setShowFromCalendar(!showFromCalendar)
                        setShowToCalendar(false)
                      }}
                      className="w-full px-3 py-2 border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      readOnly
                    />
                    <svg
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>

                    {/* Calendar Dropdown */}
                    {showFromCalendar && (
                      <div className="absolute top-full left-0 mt-2 bg-surface border border-border shadow-lg z-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <button className="p-1 hover:bg-surface-secondary">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <span className="font-medium text-sm">Jan 2026</span>
                          <button className="p-1 hover:bg-surface-secondary">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs">
                          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                            <div key={day} className="font-medium text-text-muted p-2">
                              {day}
                            </div>
                          ))}
                          {Array.from({ length: 35 }, (_, i) => {
                            const day = i - 2
                            const isCurrentMonth = day >= 1 && day <= 31
                            const isSelected = day === 26
                            return (
                              <button
                                key={i}
                                className={`p-2 text-xs ${
                                  !isCurrentMonth
                                    ? 'text-text-muted'
                                    : isSelected
                                      ? 'bg-primary text-white'
                                      : 'text-text-primary hover:bg-surface-secondary'
                                }`}
                              >
                                {day < 1 ? 29 + day : day > 31 ? day - 31 : day}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* To Date */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">To</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      onClick={() => {
                        setShowToCalendar(!showToCalendar)
                        setShowFromCalendar(false)
                      }}
                      className="w-full px-3 py-2 border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      readOnly
                    />
                    <svg
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>

                    {/* Calendar Dropdown */}
                    {showToCalendar && (
                      <div className="absolute top-full left-0 mt-2 bg-surface border border-border shadow-lg z-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <button className="p-1 hover:bg-surface-secondary">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <span className="font-medium text-sm">Feb 2026</span>
                          <button className="p-1 hover:bg-surface-secondary">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs">
                          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                            <div key={day} className="font-medium text-text-muted p-2">
                              {day}
                            </div>
                          ))}
                          {Array.from({ length: 35 }, (_, i) => {
                            const day = i - 5
                            const isCurrentMonth = day >= 1 && day <= 28
                            return (
                              <button
                                key={i}
                                className={`p-2 text-xs ${
                                  !isCurrentMonth
                                    ? 'text-text-muted'
                                    : 'text-text-primary hover:bg-surface-secondary'
                                }`}
                              >
                                {day < 1 ? 26 + day : day > 28 ? day - 28 : day}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* File Format Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-primary mb-3">Select the file format</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={fileFormat === 'excel'}
                      onChange={() => setFileFormat('excel')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-text-primary">Excel</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={fileFormat === 'csv'}
                      onChange={() => setFileFormat('csv')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-text-primary">.CSV</span>
                  </label>
                </div>
              </div>

              {/* Detailed Breakdown Checkbox (if applicable) */}
              {currentReport?.hasDetailedBreakdown && (
                <div className="mb-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDetailedBreakdown}
                      onChange={(e) => setShowDetailedBreakdown(e.target.checked)}
                      className="w-4 h-4 mt-0.5"
                    />
                    <span className="text-sm text-text-primary">
                      Show detailed breakdown of Amazon fees, refund costs and COGS
                    </span>
                  </label>
                </div>
              )}

              {/* Download Button */}
              <Button variant="primary" onClick={handleDownload}>
                Download
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </Container>
  )
}
