'use client'

import React, { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { CountryProfitBreakdown } from '@/services/api/profit.api'
import { cn } from '@/utils/cn'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
)

// Fix for default Leaflet marker icons in Next.js
// This runs only on client side
if (typeof window !== 'undefined') {
  const L = require('leaflet')
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

/**
 * LeafletMap Component
 * 
 * Interactive world map using Leaflet
 * Colors countries based on profit data
 */

export interface LeafletMapProps {
  data: CountryProfitBreakdown[]
  className?: string
  intensity?: number // 0-100 for adjusting color intensity
}

/**
 * Get color based on profit value
 */
const getColorForProfit = (
  profit: number,
  maxProfit: number,
  minProfit: number,
  intensity: number = 50
): string => {
  if (maxProfit === minProfit) return '#c8c8ff'

  // Normalize profit to 0-1 range
  const normalized = (profit - minProfit) / (maxProfit - minProfit)

  // Apply intensity multiplier (0-100 -> 0.3-1.0)
  const intensityMultiplier = 0.3 + (intensity / 100) * 0.7
  const adjustedNormalized = normalized * intensityMultiplier

  // Create gradient from light blue to dark blue
  const red = Math.round(200 - adjustedNormalized * 200)
  const green = Math.round(200 - adjustedNormalized * 200)
  const blue = Math.round(255 - adjustedNormalized * 105)

  return `rgb(${red}, ${green}, ${blue})`
}

export const LeafletMap: React.FC<LeafletMapProps> = ({ data, className, intensity = 50 }) => {
  const [isClient, setIsClient] = useState(false)
  const [geoJsonData, setGeoJsonData] = useState<any>(null)

  // Ensure this only runs on client
  useEffect(() => {
    setIsClient(true)
  }, [])

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

  // Load world map GeoJSON
  useEffect(() => {
    if (isClient) {
      fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
        .then((res) => res.json())
        .then((data) => setGeoJsonData(data))
        .catch((err) => {
          console.error('Failed to load world map GeoJSON:', err)
          setGeoJsonData({ type: 'FeatureCollection', features: [] })
        })
    }
  }, [isClient])

  // Style function for GeoJSON features
  const styleFeature = (feature: any) => {
    const countryCode = feature.properties.ISO_A2 || feature.properties.iso_a2
    const countryData = countryDataMap.get(countryCode)

    if (countryData) {
      return {
        fillColor: getColorForProfit(countryData.profit, maxProfit, minProfit, intensity),
        fillOpacity: 0.7,
        color: '#fff',
        weight: 1,
        opacity: 0.5,
      }
    }

    return {
      fillColor: '#f0f0f0',
      fillOpacity: 0.3,
      color: '#ccc',
      weight: 1,
      opacity: 0.3,
    }
  }

  // Handle feature click/hover
  const onEachFeature = (feature: any, layer: any) => {
    const countryCode = feature.properties.ISO_A2 || feature.properties.iso_a2
    const countryData = countryDataMap.get(countryCode)

    if (countryData) {
      const countryName = feature.properties.NAME || feature.properties.name || countryCode
      const popupContent = `
        <div style="padding: 8px;">
          <strong>${countryName}</strong><br/>
          Profit: ${countryData.profit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}<br/>
          Orders: ${countryData.orders}
        </div>
      `

      layer.bindPopup(popupContent)

      layer.on({
        mouseover: (e: any) => {
          const layer = e.target
          layer.setStyle({
            weight: 2,
            color: '#3b82f6',
            fillOpacity: 0.8,
          })
        },
        mouseout: (e: any) => {
          const layer = e.target
          layer.setStyle(styleFeature(feature))
        },
      })
    }
  }

  if (!isClient) {
    return (
      <div className={cn('w-full h-full flex items-center justify-center bg-surface-tertiary', className)}>
        <div className="text-center">
          <p className="text-text-secondary">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full h-full relative', className)}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Map by Natural Earth | Leaflet'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoJsonData && (
          <GeoJSON
            data={geoJsonData}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  )
}
