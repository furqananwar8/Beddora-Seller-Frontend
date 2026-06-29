'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'

export const KeywordResearchScreen = React.memo(() => {
  const [searchTerm, setSearchTerm] = useState('')
  const [marketplace, setMarketplace] = useState('amazon-ca')

  const handleSearch = () => {
    console.log('Searching for:', searchTerm, 'in', marketplace)
  }

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Keyword Research</h1>
        <a
          href="#"
          className="flex items-center gap-2 text-primary hover:underline text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Getting Started
        </a>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto mt-20">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-text-primary mb-8">Start researching</h2>
        </div>

        {/* Search Bar */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
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
                placeholder="Search by keywords or ASINs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 w-full text-base"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
              />
            </div>

            {/* Marketplace Dropdown */}
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-3 border border-border bg-surface rounded cursor-pointer hover:bg-surface-secondary transition-colors min-w-[180px]">
                <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                <span className="flex-1 text-sm">Amazon.ca</span>
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Search Button */}
            <Button variant="primary" onClick={handleSearch} className="px-8 py-3">
              Search
            </Button>
          </div>
        </div>

        {/* Description Text */}
        <div className="text-center">
          <p className="text-text-muted text-sm leading-relaxed max-w-2xl mx-auto">
            Discover new profitable keywords for your listings using Brand Analytics data. Search by keywords or ASINs, 
            identify the top 3 ASINs for each keyword, and uncover the top keywords for different ASINs.
          </p>
        </div>
      </div>
    </Container>
  )
})

KeywordResearchScreen.displayName = 'KeywordResearchScreen'
