'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'

export const ReturnsScreen = React.memo(() => {
  const [fileFormat, setFileFormat] = useState<'excel' | 'csv'>('excel')
  const [startDate, setStartDate] = useState('17 October, 2025')
  const estimatedAmount = 'C$ 2,285'
  const lastUpdate = '24/01/2026'

  const handleDownload = () => {
    console.log(`Downloading report in ${fileFormat} format from ${startDate}`)
  }

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-6">Returns</h1>
        
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
        <div className="flex gap-8">
          <div className="flex-1">
            <p className="text-text-primary mb-4 leading-relaxed">
              When a customer initiates a refund, amazon reimburses the whole sum right away (and charges the seller) 
              without waiting for the actual return to arrive in the FBA warehouse. Some customers change their mind and 
              actually don't send the product back. Amazon waits for 45 days and if the product still hasn't been returned, 
              charges the customer again and reimburses the seller. However, sometimes the last step (reimbursement to 
              the seller) doesn't take place, that is the product wasn't returned, but amazon doesn't reimburse you either. 
              This report helps you find such cases in order to ask the seller support to research and reimburse you the 
              money.
            </p>
            <p className="text-text-primary leading-relaxed">
              Please note that the potential reimbursements in the report are estimations. The seller support might 
              reimburse less or decline your request completely.
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="w-[170px] h-[120px] bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg p-4 relative overflow-hidden">
              <div className="text-white text-xs font-semibold mb-2">sellerboard</div>
              <div className="text-white text-xs mb-1">Money back:</div>
              <div className="text-white text-xs font-semibold mb-3">Returns</div>
              <div className="absolute bottom-2 right-2">
                <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
              <div className="absolute top-8 right-4">
                <div className="w-16 h-20 bg-white rounded shadow-md opacity-90 transform rotate-6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Download the report */}
      <div className="mb-10">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          2. Download the report
        </h3>
        <p className="text-text-primary mb-4 leading-relaxed">
          The report is created for the time period, which was imported into sellerboard (max. 105 days however), up to 
          today. Please download the report and check the cases found one by one.
        </p>
        <p className="text-text-primary mb-6 leading-relaxed">
          <strong>Important:</strong> sometimes sellers issue refunds to customers without asking the customer to send the product 
          back. Please find these cases manually in the report and do not file support tickets for them.
        </p>
        
        {/* Start Date */}
        <div className="mb-6">
          <div className="text-text-primary font-medium mb-3">Start date</div>
          <div className="relative inline-block">
            <button className="flex items-center gap-2 px-4 py-2 border border-border bg-surface hover:bg-surface-secondary transition-colors rounded min-w-[200px]">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-text-muted">{startDate}</span>
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

        <Button variant="primary" onClick={handleDownload} className="px-8 mb-6">
          Download
        </Button>

        {/* Warning Message */}
        <div className="text-red-600 text-sm leading-relaxed max-w-3xl">
          Check every reimbursement to make sure it wasn't initiated by you earlier. Sometimes sellers reimburse the 
          customers without asking them to send the product back. Please exclude such cases from your support ticket. 
          Also, please exclude cases for non-returnable ASIN's. The money back report cannot identify these cases 
          automatically and lists them as FBA-errors.
        </div>
      </div>

      {/* Section 3: Contact seller support */}
      <div className="mb-10">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          3. Contact seller support
        </h3>
        <div className="flex gap-8">
          <div className="flex-1">
            <p className="text-text-primary mb-4 leading-relaxed">
              Open a seller support ticket in the category: "Fulfillment by Amazon{'>'} Inventory Damaged or Lost in 
              Warehouse" (<a href="#" className="text-primary hover:underline">link for US accounts</a> or <a href="#" className="text-primary hover:underline">link for European accounts</a>). There you will be able to open investigations 
              for your returns by choosing the "Customer Return" option.
            </p>
            <p className="text-text-primary mb-4 leading-relaxed">
              If you cannot find the option you are searching for in the provided list, kindly choose the option that says 'My 
              issue is not listed'.
            </p>
            <p className="text-text-primary mb-6 leading-relaxed">
              We prepared a template for you. Please click here:
            </p>
            <Button variant="primary" onClick={() => console.log('Show template')} className="px-6 mb-6">
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

ReturnsScreen.displayName = 'ReturnsScreen'
