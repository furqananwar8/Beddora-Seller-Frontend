'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { CountryProfitBreakdown } from '@/services/api/profit.api'
import { cn } from '@/utils/cn'
import 'leaflet/dist/leaflet.css'

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

if (typeof window !== 'undefined') {
  const L = require('leaflet')
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

export interface LeafletMapProps {
  data: CountryProfitBreakdown[]
  className?: string
  onCountryClick?: (countryCode: string) => void
}

const ISO3_TO_ISO2: Record<string, string> = {
  USA: 'US',
  CAN: 'CA',
  GBR: 'GB',
  DEU: 'DE',
  FRA: 'FR',
  ITA: 'IT',
  ESP: 'ES',
  JPN: 'JP',
  AUS: 'AU',
  IND: 'IN',
  BRA: 'BR',
  MEX: 'MX',
  NLD: 'NL',
  SWE: 'SE',
  POL: 'PL',
  TUR: 'TR',
  ARE: 'AE',
  SGP: 'SG',
}

const NAME_TO_ISO2: Record<string, string> = {
  'United States': 'US',
  'United States of America': 'US',
  'USA': 'US',
  'Canada': 'CA',
  'United Kingdom': 'GB',
  'Great Britain': 'GB',
  'Germany': 'DE',
  'France': 'FR',
  'Italy': 'IT',
  'Spain': 'ES',
  'Japan': 'JP',
  'Australia': 'AU',
  'India': 'IN',
  'Brazil': 'BR',
  'Mexico': 'MX',
  'Netherlands': 'NL',
  'Sweden': 'SE',
  'Poland': 'PL',
  'Turkey': 'TR',
  'United Arab Emirates': 'AE',
  'Singapore': 'SG',
}

const getColorForProfit = (
  profit: number,
  maxProfit: number,
  minProfit: number
): string => {
  if (maxProfit === minProfit) return '#2563eb'
  const normalized = (profit - minProfit) / (maxProfit - minProfit)
  const red = Math.round(59 + (1 - normalized) * 100)
  const green = Math.round(130 + (1 - normalized) * 80)
  const blue = Math.round(246 + (1 - normalized) * 9)
  return `rgb(${red}, ${green}, ${blue})`
}

export const LeafletMap: React.FC<LeafletMapProps> = ({ data, className, onCountryClick }) => {
  const [isClient, setIsClient] = useState(false)
  const [geoJsonData, setGeoJsonData] = useState<any>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const countryDataMap = useMemo(() => {
    const map = new Map<string, CountryProfitBreakdown>()
    data.forEach((item) => {
      if (item.country) map.set(item.country, item)
    })
    return map
  }, [data])

  const { minProfit, maxProfit } = useMemo(() => {
    if (data.length === 0) return { minProfit: 0, maxProfit: 0 }
    const profits = data.map((item) => item.profit)
    return {
      minProfit: Math.min(...profits),
      maxProfit: Math.max(...profits),
    }
  }, [data])

  useEffect(() => {
    if (!isClient) return
    fetch(
      'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
    )
      .then((res) => {
        if (!res.ok) throw new Error('Primary failed')
        return res.json()
      })
      .then((json) => {
        setGeoJsonData(json)
        setLoadError(null)
      })
      .catch(() => {
        fetch(
          'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json'
        )
          .then((r) => r.json())
          .then((j) => {
            setGeoJsonData(j)
            setLoadError(null)
          })
          .catch(() => setLoadError('Failed to load map boundaries'))
      })
  }, [isClient])

  const getCountryCode = useCallback((feature: any): string | null => {
    const p = feature?.properties
    if (!p) return null

    const iso2 = p.ISO_A2 || p.iso_a2 || p.ISO_A2_EH || null
    if (iso2 && iso2.length === 2) return iso2

    const iso3 = p.ADM0_A3 || p.ISO_A3 || p.iso_a3 || p.id || null
    if (iso3 && iso3.length === 3) {
      const mapped = ISO3_TO_ISO2[iso3.toUpperCase()]
      if (mapped) return mapped
    }

    const name = p.NAME || p.name || p.ADMIN || p.formal_en || p.sovereignt || ''
    const nameKey = Object.keys(NAME_TO_ISO2).find(
      (n) => name.toLowerCase() === n.toLowerCase()
    )
    if (nameKey) return NAME_TO_ISO2[nameKey]

    return null
  }, [])

  const styleFeature = useCallback(
    (feature: any) => {
      const code = getCountryCode(feature)
      const countryData = code ? countryDataMap.get(code) : null

      if (countryData) {
        return {
          fillColor: getColorForProfit(
            countryData.profit,
            maxProfit,
            minProfit
          ),
          weight: 1.5,
          opacity: 1,
          color: '#1e40af',
          fillOpacity: 0.75,
        }
      }

      return {
        fillColor: '#e5e7eb',
        weight: 0.5,
        opacity: 0.4,
        color: '#9ca3af',
        fillOpacity: 0.15,
      }
    },
    [countryDataMap, maxProfit, minProfit, getCountryCode]
  )

 const onEachFeature = useCallback(
  (feature: any, layer: any) => {
    const code = getCountryCode(feature)
    const countryData = code ? countryDataMap.get(code) : null
    const name =
      feature.properties?.NAME ||
      feature.properties?.name ||
      feature.properties?.ADMIN ||
      code ||
      'Unknown'

    if (countryData) {
      layer.bindPopup(
        `<div style="padding:10px;font-family:sans-serif;min-width:180px;">
          <div style="font-weight:600;font-size:15px;margin-bottom:6px;">${name}</div>
          <div style="font-size:13px;color:#333;line-height:1.5;">
            <div><strong>Profit:</strong> $${countryData.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div><strong>Orders:</strong> ${countryData.orders}</div>
          </div>
        </div>`
      )

      layer.bindTooltip(name, {
        permanent: true,
        direction: 'center',
        className: 'country-label',
        opacity: 1,
      })

      layer.on({
        mouseover: (e: any) => {
          e.target.setStyle({ weight: 2.5, color: '#f59e0b', fillOpacity: 0.9 })
        },
        mouseout: (e: any) => {
          e.target.setStyle(styleFeature(feature))
        },
        click: (e: any) => {
          if (code && onCountryClick) {
            onCountryClick(e.originalEvent as any)  // ← pass native event
          }
        },
      })
    }
  },
  [countryDataMap, styleFeature, getCountryCode, onCountryClick]  // ← add dependency
)

  useEffect(() => {
    if (!geoJsonData || !data.length) return
    const features = geoJsonData.features || []
    const matched: string[] = []
    const unmatched: string[] = []

    features.forEach((f: any) => {
      const code = getCountryCode(f)
      if (!code) return
      if (countryDataMap.has(code)) {
        matched.push(code)
      } else {
        unmatched.push(code)
      }
    })

    console.log('[LeafletMap] Data codes:', data.map((d) => d.country))
    console.log('[LeafletMap] Matched features:', matched)
    console.log('[LeafletMap] Unmatched features (first 20):', unmatched.slice(0, 20))
  }, [geoJsonData, data, countryDataMap, getCountryCode])

  if (!isClient) {
    return (
      <div
        className={cn(
          'w-full h-full flex items-center justify-center bg-surface-tertiary',
          className
        )}
      >
        <p className="text-text-secondary">Loading map...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div
        className={cn(
          'w-full h-full flex items-center justify-center bg-surface-tertiary',
          className
        )}
      >
        <div className="text-center">
          <p className="text-red-500 font-medium">{loadError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full h-full relative', className)}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoJsonData && (
          <GeoJSON
            key={`geojson-${data.map((d) => d.country).join('-')}-${data.map((d) => d.profit).join('-')}`}
            data={geoJsonData}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      {/* CSS for country labels */}
      <style jsx global>{`
        .country-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          font-size: 11px;
          font-weight: 600;
          color: #1e3a8a;
          text-shadow: 0 0 3px rgba(255, 255, 255, 0.9), 0 0 2px rgba(255, 255, 255, 0.9);
          white-space: nowrap;
          pointer-events: none;
        }
        .country-label::before {
          display: none !important;
        }
      `}</style>
    </div>
  )
}