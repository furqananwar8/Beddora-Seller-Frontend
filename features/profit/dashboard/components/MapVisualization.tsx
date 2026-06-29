'use client'

import React, { useState, useMemo } from 'react'
import { CountryProfitBreakdown } from '@/services/api/profit.api'
import { formatCurrency, formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'

/**
 * MapVisualization Component
 * 
 * Displays a world map with countries colored according to profit
 * Uses SVG paths for a simple, dependency-free world map
 * 
 * @example
 * <MapVisualization
 *   data={[
 *     { country: "US", profit: 1200, orders: 50 },
 *     { country: "GB", profit: 800, orders: 35 }
 *   ]}
 * />
 */

export interface MapVisualizationProps {
  data: CountryProfitBreakdown[]
  className?: string
}

// Simplified world map data - major countries with their coordinates
// In production, you might want to use a library like react-simple-maps
// or a more complete GeoJSON dataset
const WORLD_MAP_DATA: Array<{
  code: string
  name: string
  path: string
  viewBox: string
}> = [
  {
    code: 'US',
    name: 'United States',
    path: 'M 100 150 L 150 150 L 150 200 L 100 200 Z',
    viewBox: '0 0 300 300',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    path: 'M 150 100 L 170 100 L 170 120 L 150 120 Z',
    viewBox: '0 0 300 300',
  },
  {
    code: 'CA',
    name: 'Canada',
    path: 'M 80 80 L 150 80 L 150 150 L 80 150 Z',
    viewBox: '0 0 300 300',
  },
  {
    code: 'DE',
    name: 'Germany',
    path: 'M 160 110 L 180 110 L 180 130 L 160 130 Z',
    viewBox: '0 0 300 300',
  },
  {
    code: 'FR',
    name: 'France',
    path: 'M 150 110 L 170 110 L 170 130 L 150 130 Z',
    viewBox: '0 0 300 300',
  },
  {
    code: 'IT',
    name: 'Italy',
    path: 'M 165 125 L 175 125 L 175 140 L 165 140 Z',
    viewBox: '0 0 300 300',
  },
  {
    code: 'ES',
    name: 'Spain',
    path: 'M 145 120 L 160 120 L 160 135 L 145 135 Z',
    viewBox: '0 0 300 300',
  },
  {
    code: 'JP',
    name: 'Japan',
    path: 'M 220 130 L 235 130 L 235 145 L 220 145 Z',
    viewBox: '0 0 300 300',
  },
  {
    code: 'AU',
    name: 'Australia',
    path: 'M 210 200 L 250 200 L 250 230 L 210 230 Z',
    viewBox: '0 0 300 300',
  },
  {
    code: 'IN',
    name: 'India',
    path: 'M 190 150 L 210 150 L 210 170 L 190 170 Z',
    viewBox: '0 0 300 300',
  },
  {
    code: 'BR',
    name: 'Brazil',
    path: 'M 120 180 L 160 180 L 160 220 L 120 220 Z',
    viewBox: '0 0 300 300',
  },
  {
    code: 'MX',
    name: 'Mexico',
    path: 'M 90 160 L 120 160 L 120 180 L 90 180 Z',
    viewBox: '0 0 300 300',
  },
]

/**
 * Get color intensity based on profit value
 * Higher profit = darker color
 */
const getColorIntensity = (profit: number, maxProfit: number, minProfit: number): string => {
  if (maxProfit === minProfit) return 'rgb(200, 200, 255)' // Default light blue

  // Normalize profit to 0-1 range
  const normalized = (profit - minProfit) / (maxProfit - minProfit)

  // Create gradient from light blue (low profit) to dark blue (high profit)
  // RGB values: light blue (200, 200, 255) -> dark blue (0, 0, 150)
  const red = Math.round(200 - normalized * 200)
  const green = Math.round(200 - normalized * 200)
  const blue = Math.round(255 - normalized * 105)

  return `rgb(${red}, ${green}, ${blue})`
}

export const MapVisualization: React.FC<MapVisualizationProps> = ({ data, className }) => {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  // Create a map of country code to profit data
  const countryDataMap = useMemo(() => {
    const map = new Map<string, CountryProfitBreakdown>()
    data.forEach((item) => {
      map.set(item.country, item)
    })
    return map
  }, [data])

  // Calculate min and max profit for color scaling
  const { minProfit, maxProfit } = useMemo(() => {
    if (data.length === 0) return { minProfit: 0, maxProfit: 0 }

    const profits = data.map((item) => item.profit)
    return {
      minProfit: Math.min(...profits),
      maxProfit: Math.max(...profits),
    }
  }, [data])

  // Handle mouse move for tooltip positioning
  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    setTooltipPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  // Get country data for tooltip
  const tooltipData = hoveredCountry ? countryDataMap.get(hoveredCountry) : null

  return (
    <div className={cn('relative w-full h-full min-h-[400px]', className)}>
      <svg
        viewBox="0 0 300 300"
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoveredCountry(null)
          setTooltipPosition(null)
        }}
      >
        {/* Render each country */}
        {WORLD_MAP_DATA.map((country) => {
          const countryData = countryDataMap.get(country.code)
          const isHovered = hoveredCountry === country.code
          const hasData = !!countryData

          // Get color based on profit
          const fillColor = hasData
            ? getColorIntensity(countryData.profit, maxProfit, minProfit)
            : 'rgb(240, 240, 240)' // Light gray for countries without data

          return (
            <g key={country.code}>
              <path
                d={country.path}
                fill={fillColor}
                stroke={isHovered ? '#3b82f6' : '#e5e7eb'}
                strokeWidth={isHovered ? 2 : 1}
                className={cn(
                  'transition-all duration-200',
                  hasData && 'cursor-pointer hover:opacity-80'
                )}
                onMouseEnter={() => {
                  if (hasData) {
                    setHoveredCountry(country.code)
                  }
                }}
                onMouseLeave={() => {
                  if (hoveredCountry === country.code) {
                    setHoveredCountry(null)
                  }
                }}
              />
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltipData && tooltipPosition && (
        <div
          className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-3 pointer-events-none"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="text-sm font-semibold text-gray-900 mb-1">
            {WORLD_MAP_DATA.find((c) => c.code === tooltipData.country)?.name ||
              tooltipData.country}
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              <span className="font-medium">Profit:</span>{' '}
              {formatCurrency(tooltipData.profit)}
            </div>
            <div>
              <span className="font-medium">Orders:</span>{' '}
              {formatNumber(tooltipData.orders, 0)}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <div className="text-xs font-semibold text-gray-700 mb-2">Profit Intensity</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(200, 200, 255)' }} />
          <span className="text-xs text-gray-600">Low</span>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(100, 100, 200)' }} />
          <span className="text-xs text-gray-600">Medium</span>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(0, 0, 150)' }} />
          <span className="text-xs text-gray-600">High</span>
        </div>
      </div>
    </div>
  )
}
