'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'

export const FbaFeeChangesScreen = React.memo(() => {
  const [fileFormat, setFileFormat] = useState<'excel' | 'csv'>('excel')
  const [period, setPeriod] = useState('30 October, 2025 - 30 January, 2026')

  const handleDownload = () => {
    console.log(`Downloading report in ${fileFormat} format for period ${period}`)
  }

  const handleShowTemplate = () => {
    console.log('Show template')
  }

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-text-primary">FBA Fee Changes</h1>
      </div>

      {/* Section 1: How does this work? */}
      <div className="mb-10">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          1. How does this work?
        </h3>
        <div className="max-w-4xl">
          <p className="text-text-primary mb-4 leading-relaxed">
            This report shows ASINs and examples of orders, for which FBA fees was changed. As soon as sellerboard 
            detects an order with a new FBA fee, the order is added to this report. You can use this report to track FBA fee 
            changes and open a seller support ticket with a request to remeasure the product if wrong FBA fees were 
            applied.
          </p>
          <p className="text-text-primary leading-relaxed">
            Please note that the potential reimbursements in the report are estimations. The seller support might 
            reimburse less or decline your request completely.
          </p>
        </div>
      </div>

      {/* Section 2: Download the report */}
      <div className="mb-10">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          2. Download the report
        </h3>
        <p className="text-text-primary mb-6 leading-relaxed max-w-4xl">
          Please specify a time range (e.g. last 18 months) and download the report.
        </p>
        
        {/* Period Selector */}
        <div className="mb-6">
          <div className="text-text-primary font-medium mb-3">Period</div>
          <div className="relative inline-block">
            <button className="flex items-center gap-2 px-4 py-2 border border-border bg-surface hover:bg-surface-secondary transition-colors rounded min-w-[280px]">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-text-muted">{period}</span>
              <svg className="w-4 h-4 text-text-muted ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* File Format */}
        <div className="mb-6">
          <div className="text-text-primary font-medium mb-3">Select the file format</div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fileFormat"
                value="excel"
                checked={fileFormat === 'excel'}
                onChange={(e) => setFileFormat(e.target.value as 'excel' | 'csv')}
                className="w-4 h-4 text-primary"
              />
              <span className="text-text-primary">Excel</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fileFormat"
                value="csv"
                checked={fileFormat === 'csv'}
                onChange={(e) => setFileFormat(e.target.value as 'excel' | 'csv')}
                className="w-4 h-4 text-primary"
              />
              <span className="text-text-primary">.CSV</span>
            </label>
          </div>
        </div>

        <Button variant="primary" onClick={handleDownload} className="px-8">
          Download
        </Button>
      </div>

      {/* Section 3: Contact seller support */}
      <div className="mb-10">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          3. Contact seller support
        </h3>
        <div className="flex gap-8">
          <div className="flex-1 max-w-3xl">
            <p className="text-text-primary mb-6 leading-relaxed">
              Open a seller support ticket in the category "Fulfillment by Amazon {'>'} Investigate other FBA issue {'>'} 
              Confirm/Request Reimbursement for Product Weights and Dimensions" (<a href="#" className="text-primary hover:underline">link</a> for US accounts or <a href="#" className="text-primary hover:underline">link</a> for 
              European accounts).
            </p>
            <p className="text-text-primary mb-6 leading-relaxed">
              We prepared a sample ticket text for you. Please click here:
            </p>
            <Button variant="primary" onClick={handleShowTemplate} className="px-6 mb-6">
              Show template
            </Button>
            <p className="text-text-muted text-sm leading-relaxed">
              Do not open too many support cases for reimbursements at once. We recommend opening one at a time.
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="w-[170px] h-[140px] bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-hidden">
              <div className="text-[8px] text-gray-600 mb-2">Contact seller support</div>
              <div className="space-y-1">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-2 bg-gray-200 rounded" style={{ width: `${70 + Math.random() * 30}%` }}></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
})

FbaFeeChangesScreen.displayName = 'FbaFeeChangesScreen'
