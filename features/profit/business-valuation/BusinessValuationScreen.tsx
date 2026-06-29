'use client'

import React, { useState, useEffect } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
import { Badge } from '@/design-system/badges'

interface ValuationInputs {
  monthlySales: string
  monthlyProfit: string
  yearlyGrowthRate: string
  businessAge: string
  numberOfEmployees: string
  brandRegistry: boolean
}

interface ValuationResult {
  estimated: number
  optimistic: number
  pessimistic: number
  multiple: number
}

export const BusinessValuationScreen: React.FC = () => {
  const [inputs, setInputs] = useState<ValuationInputs>({
    monthlySales: '23,144.44',
    monthlyProfit: '-3,767.8',
    yearlyGrowthRate: '20',
    businessAge: '24',
    numberOfEmployees: '1',
    brandRegistry: true,
  })

  const [valuation, setValuation] = useState<ValuationResult>({
    estimated: 138867,
    optimistic: 277733,
    pessimistic: 0,
    multiple: 6,
  })

  const calculateValuation = () => {
    const profit = parseFloat(inputs.monthlyProfit.replace(/,/g, ''))
    const sales = parseFloat(inputs.monthlySales.replace(/,/g, ''))
    const growth = parseFloat(inputs.yearlyGrowthRate)
    const age = parseInt(inputs.businessAge)
    const employees = parseInt(inputs.numberOfEmployees)

    // Base multiple calculation (simplified)
    let baseMultiple = 6

    // Adjust for growth rate
    if (growth > 30) baseMultiple += 2
    else if (growth > 20) baseMultiple += 1

    // Adjust for business age
    if (age > 36) baseMultiple += 1
    else if (age < 12) baseMultiple -= 1

    // Adjust for brand registry
    if (inputs.brandRegistry) baseMultiple += 0.5

    // Adjust for employees
    if (employees > 5) baseMultiple += 1

    const avgProfit = Math.abs(profit)
    const estimated = avgProfit * baseMultiple * 12
    const optimistic = estimated * 2
    const pessimistic = profit < 0 ? 0 : estimated * 0.5

    setValuation({
      estimated: Math.round(estimated),
      optimistic: Math.round(optimistic),
      pessimistic: Math.round(pessimistic),
      multiple: Math.round(baseMultiple),
    })
  }

  useEffect(() => {
    calculateValuation()
  }, [inputs])

  const handleInputChange = (field: keyof ValuationInputs, value: string | boolean) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const formatCurrency = (value: number) => {
    return `C$ ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const InfoIcon = () => (
    <button className="ml-2 text-text-muted hover:text-text-primary transition-colors" aria-label="Info">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </button>
  )

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Business Valuation</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left Column - Calculator */}
        <div>
          <Card>
            <CardContent className="p-6">
              {/* Header Section */}
              <div className="mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-text-primary mb-2">
                      Calculate the value of your business
                    </h2>
                    <div className="text-xs text-text-secondary space-y-1">
                      <p>
                        The estimated business value is the average monthly profit over the past 12 months multiplied
                        by a valuation multiple (12-24), adjusted logarithmically based on profit margin, growth rate,
                        and business age. The slider position also considers employees and brand registration.
                      </p>
                      <p>
                        If profit is negative or data is missing, we estimate value as six months' average revenue.
                      </p>
                      <p className="italic">This is only an estimate—precise valuation requires individual assessment.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions Form */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-text-primary mb-3">Questions for valuation</h3>

                {/* Sales Input */}
                <div className="flex items-center gap-3">
                  <label className="w-44 text-xs text-text-primary flex items-center">
                    Sales, monthly, C$
                    <InfoIcon />
                  </label>
                  <Input
                    type="text"
                    value={inputs.monthlySales}
                    onChange={(e) => handleInputChange('monthlySales', e.target.value)}
                    className="w-44"
                  />
                </div>

                {/* Profit Input */}
                <div className="flex items-center gap-3">
                  <label className="w-44 text-xs text-text-primary flex items-center">
                    Profit, monthly, C$
                    <InfoIcon />
                  </label>
                  <Input
                    type="text"
                    value={inputs.monthlyProfit}
                    onChange={(e) => handleInputChange('monthlyProfit', e.target.value)}
                    className="w-44"
                  />
                </div>

                {/* Growth Rate Input */}
                <div className="flex items-center gap-3">
                  <label className="w-44 text-xs text-text-primary flex items-center">
                    Yearly growth rate, %
                    <InfoIcon />
                  </label>
                  <Input
                    type="text"
                    value={inputs.yearlyGrowthRate}
                    onChange={(e) => handleInputChange('yearlyGrowthRate', e.target.value)}
                    className="w-44"
                  />
                </div>

                {/* Business Age Input */}
                <div className="flex items-center gap-3">
                  <label className="w-44 text-xs text-text-primary flex items-center">
                    Business age, months
                    <InfoIcon />
                  </label>
                  <Input
                    type="text"
                    value={inputs.businessAge}
                    onChange={(e) => handleInputChange('businessAge', e.target.value)}
                    className="w-44"
                  />
                </div>

                {/* Number of Employees Input */}
                <div className="flex items-center gap-3">
                  <label className="w-44 text-xs text-text-primary flex items-center">
                    Nr. of employees
                    <InfoIcon />
                  </label>
                  <Input
                    type="text"
                    value={inputs.numberOfEmployees}
                    onChange={(e) => handleInputChange('numberOfEmployees', e.target.value)}
                    className="w-44"
                  />
                </div>

                {/* Brand Registry Radio */}
                <div className="flex items-center gap-3">
                  <label className="w-44 text-xs text-text-primary flex items-center">
                    Brand registry
                    <InfoIcon />
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={inputs.brandRegistry === true}
                        onChange={() => handleInputChange('brandRegistry', true)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-text-primary">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={inputs.brandRegistry === false}
                        onChange={() => handleInputChange('brandRegistry', false)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-text-primary">No</span>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exit.io Section */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary mb-2">
                    Do you want to sell your business?
                  </h3>
                  <p className="text-xs text-text-secondary mb-3">
                    List your business on exit.io, the platform for buying and selling Amazon FBA businesses.
                    <br />
                    Free to use right now - no listing fees, no commissions.
                  </p>
                  <Button variant="primary" size="sm" onClick={() => window.open('https://exit.io', '_blank')}>
                    Register for free on exit.io
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Valuation Results */}
        <div className="flex flex-col">
          {/* Optimistic Price - Top */}
          <div className="text-right py-4 px-6 bg-surface">
            <div className="text-2xl font-bold text-text-primary">{formatCurrency(valuation.optimistic)}</div>
            <div className="text-xs text-text-muted">Optimistic price</div>
            <div className="text-lg font-semibold text-text-primary">{valuation.multiple * 2}x</div>
          </div>

          {/* Top Half - Optimistic to Estimated (50% height) */}
          <div className="relative flex-1 bg-surface-secondary">
            {/* Vertical line track */}
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-300"></div>
            
            {/* Green filled portion - dynamic based on position */}
            <div 
              className="absolute right-0 top-0 w-1 bg-green-500"
              style={{ 
                height: `${((valuation.optimistic - valuation.estimated) / (valuation.optimistic - valuation.pessimistic)) * 100}%`
              }}
            ></div>
            
            {/* Green circle indicator - dynamic position */}
            <div 
              className="absolute right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg z-10"
              style={{ 
                top: `${((valuation.optimistic - valuation.estimated) / (valuation.optimistic - valuation.pessimistic)) * 100}%`,
                transform: 'translate(50%, -50%)'
              }}
            ></div>
          </div>

          {/* Estimated Valuation - Center Card */}
          <Card className="shadow-lg -my-2 z-20 relative">
            <CardContent className="p-4 text-center">
              <div className="flex justify-end mb-1">
                <Badge variant="success">{valuation.multiple}x</Badge>
              </div>
              <div className="text-3xl font-bold text-text-primary mb-1">{formatCurrency(valuation.estimated)}</div>
              <div className="text-xs text-text-muted mb-0.5">Estimated valuation</div>
              <div className="text-xs text-text-muted">Average monthly net profit multiple</div>
            </CardContent>
          </Card>

          {/* Bottom Half - Estimated to Pessimistic (50% height) */}
          <div className="relative flex-1 bg-surface-secondary">
            {/* Vertical line track */}
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-300"></div>
          </div>

          {/* Pessimistic Price - Bottom */}
          <div className="text-right py-4 px-6 bg-surface">
            <div className="text-2xl font-bold text-text-primary">{formatCurrency(valuation.pessimistic)}</div>
            <div className="text-xs text-text-muted">Pessimistic price</div>
            <div className="text-lg font-semibold text-text-primary">
              {Math.round(valuation.multiple * 0.5)}x
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}
