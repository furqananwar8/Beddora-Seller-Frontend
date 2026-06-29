'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'

export const ReimbursementGapScreen = React.memo(() => {
  const [fileFormat, setFileFormat] = useState<'excel' | 'csv'>('excel')
  const [period, setPeriod] = useState('1 December, 2025 - 30 January, 2026')
  const estimatedAmount = 'C$ 10'
  const lastUpdate = '28/01/2026'

  const handleDownload = () => {
    console.log(`Downloading report in ${fileFormat} format for period ${period}`)
  }

  const handleShowTemplate = () => {
    console.log('Show template')
  }

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-6">Reimbursement Gap</h1>
        
        {/* Estimated Amount */}
        <div className="mb-8">
          <h2 className="text-xl text-text-primary">
            Estimated reimbursement amount: <span className="font-semibold">{estimatedAmount}</span>
            <span className="text-sm text-text-muted ml-3">last update {lastUpdate}</span>
          </h2>
        </div>
      </div>

      {/* Section 1: How does this work? */}
      <div className="mb-10">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          1. How does this work?
        </h3>
        <div className="max-w-4xl">
          <p className="text-text-primary leading-relaxed">
            The report identifies cases where Amazon reimbursed you for inventory but paid less than your cost of goods 
            sold (COGS). It compares Amazon's reimbursement amount with your actual COGS for the product on the 
            reimbursement date. If the report shows a shortfall, you can use the provided product and reimbursement 
            details to open a case in Seller Central, submit enclose the pricing proof, and request the missing amount 
            from Amazon - all within the 2-month claim window.
          </p>
        </div>
      </div>

      {/* Section 2: Download the report */}
      <div className="mb-10">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          2. Download the report
        </h3>
        <p className="text-text-primary mb-6 leading-relaxed max-w-4xl">
          Please specify a time range (the period is limited up to 60 days from today) and download the report.
        </p>
        
        {/* Period Selector */}
        <div className="mb-6">
          <div className="text-text-primary font-medium mb-3">Period</div>
          <div className="relative inline-block">
            <button className="flex items-center gap-2 px-4 py-2 border border-border bg-surface hover:bg-surface-secondary transition-colors rounded min-w-[300px]">
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
        <div className="max-w-4xl">
          <p className="text-text-primary mb-6 leading-relaxed">
            Open a seller support ticket in the category Fulfillment by Amazon {'>'} Other issue (<a href="#" className="text-primary hover:underline">link</a> for US accounts or <a href="#" className="text-primary hover:underline">link</a> for European accounts).
          </p>
          <p className="text-text-primary mb-6 leading-relaxed">
            We prepared a sample ticket text for you. Please click here:
          </p>
          <Button variant="primary" onClick={handleShowTemplate} className="px-6">
            Show template
          </Button>
        </div>
      </div>
    </Container>
  )
})

ReimbursementGapScreen.displayName = 'ReimbursementGapScreen'
