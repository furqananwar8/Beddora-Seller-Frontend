"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/design-system/buttons'
import { formatNumber } from '@/utils/format'
import { usePushInventoryAllocationMutation } from '@/services/api/inventoryPlanner.api'

export interface ProductItem {
  id: string
  title: string
  sku: string
  totalStock?: number
  fbaReserved?: number
  fbmAvailable?: number
  safetyBuffer?: number
}

export interface ProductAllocationState {
  productId: string
  sku: string
  title: string
  totalStock: number
  fbaAllocation: number
  safetyBuffer: number
  channels: string[] // List of marketplace account IDs (e.g., "Shopify.US", "Shopify.CA")
}

interface AllocationDrawerProps {
  isOpen: boolean
  onClose: () => void
  productIds: string[]
  products: ProductItem[]
  onConfirmSync?: (
    allocations: ProductAllocationState[],
    createFbaInbound: boolean
  ) => void
}

export interface MarketplaceAccount {
  id: string
  channel: 'Shopify' | 'Walmart' | 'Temu' | 'TikTok' | 'Amazon'
  region: 'US' | 'CA' | 'MX'
  regionFlag: string
  name: string
  badgeStyle: string
  dotStyle: string
}

// Connected Marketplace Accounts Across Regions
const MARKETPLACE_ACCOUNTS: MarketplaceAccount[] = [
  // UNITED STATES
  {
    id: 'Shopify.US',
    channel: 'Shopify',
    region: 'US',
    regionFlag: '🇺🇸',
    name: 'Shopify US',
    badgeStyle: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80',
    dotStyle: 'bg-emerald-500',
  },
  {
    id: 'Walmart.US',
    channel: 'Walmart',
    region: 'US',
    regionFlag: '🇺🇸',
    name: 'Walmart US',
    badgeStyle: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/80',
    dotStyle: 'bg-sky-500',
  },
  {
    id: 'Temu.US',
    channel: 'Temu',
    region: 'US',
    regionFlag: '🇺🇸',
    name: 'Temu US',
    badgeStyle: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80',
    dotStyle: 'bg-amber-500',
  },
  {
    id: 'TikTok.US',
    channel: 'TikTok',
    region: 'US',
    regionFlag: '🇺🇸',
    name: 'TikTok Shop US',
    badgeStyle: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80',
    dotStyle: 'bg-rose-500',
  },
  {
    id: 'Amazon.US',
    channel: 'Amazon',
    region: 'US',
    regionFlag: '🇺🇸',
    name: 'Amazon US (FBM)',
    badgeStyle: 'bg-amber-100/70 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    dotStyle: 'bg-amber-600',
  },

  // CANADA
  {
    id: 'Shopify.CA',
    channel: 'Shopify',
    region: 'CA',
    regionFlag: '🇨🇦',
    name: 'Shopify CA',
    badgeStyle: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80',
    dotStyle: 'bg-emerald-500',
  },
  {
    id: 'Walmart.CA',
    channel: 'Walmart',
    region: 'CA',
    regionFlag: '🇨🇦',
    name: 'Walmart CA',
    badgeStyle: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/80',
    dotStyle: 'bg-sky-500',
  },
  {
    id: 'Temu.CA',
    channel: 'Temu',
    region: 'CA',
    regionFlag: '🇨🇦',
    name: 'Temu CA',
    badgeStyle: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80',
    dotStyle: 'bg-amber-500',
  },
  {
    id: 'TikTok.CA',
    channel: 'TikTok',
    region: 'CA',
    regionFlag: '🇨🇦',
    name: 'TikTok Shop CA',
    badgeStyle: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80',
    dotStyle: 'bg-rose-500',
  },
  {
    id: 'Amazon.CA',
    channel: 'Amazon',
    region: 'CA',
    regionFlag: '🇨🇦',
    name: 'Amazon CA (FBM)',
    badgeStyle: 'bg-amber-100/70 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    dotStyle: 'bg-amber-600',
  },

  // MEXICO
  {
    id: 'Amazon.MX',
    channel: 'Amazon',
    region: 'MX',
    regionFlag: '🇲🇽',
    name: 'Amazon MX (FBM)',
    badgeStyle: 'bg-amber-100/70 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    dotStyle: 'bg-amber-600',
  },
]

export const AllocationDrawer: React.FC<AllocationDrawerProps> = ({
  isOpen,
  onClose,
  productIds,
  products,
  onConfirmSync,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [isStep1Completed, setIsStep1Completed] = useState<boolean>(false)
  const [rowStates, setRowStates] = useState<ProductAllocationState[]>([])
  const [createFbaInbound, setCreateFbaInbound] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)

  // RTK Query Mutation hook for backend API dispatch
  const [pushAllocation, { isLoading: isPushing }] = usePushInventoryAllocationMutation()

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && productIds.length > 0) {
      setCurrentStep(1)
      setIsStep1Completed(false)
      const selectedList = products.filter((p) => productIds.includes(p.id))
      const initialStates: ProductAllocationState[] = selectedList.map((p) => ({
        productId: p.id,
        sku: p.sku,
        title: p.title,
        totalStock: p.totalStock ?? 100,
        fbaAllocation: p.fbaReserved ?? 20,
        safetyBuffer: p.safetyBuffer ?? 5,
        channels: MARKETPLACE_ACCOUNTS.map((m) => m.id),
      }))
      setRowStates(initialStates)
    }
  }, [isOpen, productIds, products])

  const totals = useMemo(() => {
    return rowStates.reduce(
      (acc, r) => {
        const fbm = Math.max(0, r.totalStock - r.fbaAllocation - r.safetyBuffer)
        return {
          totalStock: acc.totalStock + r.totalStock,
          fbaAllocation: acc.fbaAllocation + r.fbaAllocation,
          fbmAvailable: acc.fbmAvailable + fbm,
        }
      },
      { totalStock: 0, fbaAllocation: 0, fbmAvailable: 0 }
    )
  }, [rowStates])

  if (!isOpen) return null

  const handleRowChange = (index: number, field: keyof ProductAllocationState, value: any) => {
    setRowStates((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleChannelToggle = (rowIndex: number, channelId: string) => {
    setRowStates((prev) => {
      const updated = [...prev]
      const current = updated[rowIndex].channels
      const exists = current.includes(channelId)
      const next = exists ? current.filter((c) => c !== channelId) : [...current, channelId]
      updated[rowIndex] = { ...updated[rowIndex], channels: next }
      return updated
    })
  }

  const handleSelectAllChannels = (rowIndex: number, selectAll: boolean) => {
    setRowStates((prev) => {
      const updated = [...prev]
      updated[rowIndex] = {
        ...updated[rowIndex],
        channels: selectAll ? MARKETPLACE_ACCOUNTS.map((c) => c.id) : [],
      }
      return updated
    })
  }

  const handleProceedToStep2 = () => {
    setIsStep1Completed(true)
    setCurrentStep(2)
  }

  /**
   * Executes live push to Express backend via pushAllocation mutation
   */
  const handleExecutePush = async () => {
  setIsSubmitting(true)
  try {
    const itemsToPush = rowStates.map((r) => ({
      productId: r.productId,
      sku: r.sku,
      quantity: Math.max(0, r.totalStock - r.fbaAllocation - r.safetyBuffer),
      productDetails: {
        sku: r.sku,
        title: r.title,
        price: 1099.99,
        description: `<p>${r.title}</p>`,
      },
    }))

    await pushAllocation({ items: itemsToPush }).unwrap()

    if (onConfirmSync) {
      onConfirmSync(rowStates, createFbaInbound)
    }
    onClose()
  } catch (error) {
    console.error('Failed to execute marketplace inventory push:', error)
  } finally {
    setIsSubmitting(false)
  }
}

  const getGroupedMarketplaceBadges = (selectedIds: string[]) => {
    const selectedAccounts = MARKETPLACE_ACCOUNTS.filter((m) => selectedIds.includes(m.id))
    
    const grouped = selectedAccounts.reduce<Record<string, { channel: string; regions: string[]; badgeStyle: string; dotStyle: string }>>(
      (acc, account) => {
        if (!acc[account.channel]) {
          acc[account.channel] = {
            channel: account.channel,
            regions: [],
            badgeStyle: account.badgeStyle,
            dotStyle: account.dotStyle,
          }
        }
        acc[account.channel].regions.push(account.region)
        return acc
      },
      {}
    )

    return Object.values(grouped)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-5xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between relative z-10">
          
          {/* Header & Stepper */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Inventory Allocation & Multi-Marketplace Push
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Separate FBA stock before pushing central FBM stock across connected US, CA & MX marketplaces.
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep(1)}
                className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-lg transition-all ${
                  currentStep === 1
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
                <span>Step 1: FBA / FBM Allocation & Inbound Request</span>
              </button>

              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>

              <button
                disabled={!isStep1Completed}
                onClick={() => isStep1Completed && setCurrentStep(2)}
                title={!isStep1Completed ? 'Complete Step 1 Allocation first to unlock target marketplace selection' : ''}
                className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-lg transition-all ${
                  currentStep === 2
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : isStep1Completed
                    ? 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-[10px]">
                  {isStep1Completed ? '2' : '🔒'}
                </span>
                <span>Step 2: Target Marketplaces & Live Push</span>
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-900" ref={dropdownRef}>
            
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Physical Stock</div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {formatNumber(totals.totalStock)} <span className="text-xs font-normal text-slate-400">units</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60">
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">FBA Reserved Pool</div>
                <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 mt-1">
                  {formatNumber(totals.fbaAllocation)} <span className="text-xs font-normal text-blue-400">units</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">FBM Available (To Push)</div>
                <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
                  {formatNumber(totals.fbmAvailable)} <span className="text-xs font-normal text-emerald-400">units</span>
                </div>
              </div>
            </div>

            {/* STEP 1: ALLOCATION */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-4">
                  <div className="p-2.5 bg-blue-600 text-white rounded-lg flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m-8-10l8 4m0 0v10m0-10L4 7" />
                    </svg>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-white block text-sm mb-0.5">
                      FBA Fulfillment Request Generation
                    </span>
                    Allocating units to FBA separates Amazon inbound stock from your central FBM pool.
                    Checking the box below will automatically dispatch an Amazon SP-API <code className="text-blue-600 dark:text-blue-400 font-mono">createInboundPlan</code> request for these SKUs upon confirmation.
                  </div>
                </div>

                <label className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-2 border-blue-500/40 rounded-xl cursor-pointer hover:border-blue-500 transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={createFbaInbound}
                      onChange={(e) => setCreateFbaInbound(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white block">
                        Create Amazon Inbound Fulfillment Request ({totals.fbaAllocation} Total Units)
                      </span>
                      <span className="text-xs text-slate-500">
                        Dispatches inbound shipment plans directly to Amazon SP-API for selected SKUs.
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                    {createFbaInbound ? 'SP-API Auto-Request Enabled' : 'Internal Allocation Only'}
                  </span>
                </label>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Product / SKU</th>
                        <th className="py-3.5 px-3 text-center">Total Physical Stock</th>
                        <th className="py-3.5 px-3">FBA Inbound Qty</th>
                        <th className="py-3.5 px-3">Safety Buffer</th>
                        <th className="py-3.5 px-4 text-center">Calculated FBM Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                      {rowStates.map((row, idx) => {
                        const calculatedFbm = Math.max(0, row.totalStock - row.fbaAllocation - row.safetyBuffer)
                        return (
                          <tr key={row.productId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">{row.title || row.sku}</div>
                              <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">{row.sku}</div>
                            </td>
                            <td className="py-3.5 px-3 text-center font-extrabold text-slate-700 dark:text-slate-300">
                              {row.totalStock}
                            </td>
                            <td className="py-3.5 px-3">
                              <input
                                type="number"
                                min="0"
                                max={row.totalStock}
                                value={row.fbaAllocation}
                                onChange={(e) => handleRowChange(idx, 'fbaAllocation', Number(e.target.value))}
                                className="w-24 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-3.5 px-3">
                              <input
                                type="number"
                                min="0"
                                value={row.safetyBuffer}
                                onChange={(e) => handleRowChange(idx, 'safetyBuffer', Number(e.target.value))}
                                className="w-20 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-block px-3 py-1 bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold rounded-md">
                                {calculatedFbm} units
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* STEP 2: TARGETING MATRIX */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Target Marketplace Configurations
                    </h4>
                    <p className="text-xs text-slate-500">
                      Specify which connected regional marketplace accounts receive stock updates for each SKU.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                    FBA Units Separated: {totals.fbaAllocation}
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-visible shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 w-1/4">SKU / Product</th>
                        <th className="py-3.5 px-3 text-center w-28">FBM Push Qty</th>
                        <th className="py-3.5 px-4">Active Target Marketplaces</th>
                        <th className="py-3.5 px-4 text-right w-44">Configure</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                      {rowStates.map((row, idx) => {
                        const calculatedFbm = Math.max(0, row.totalStock - row.fbaAllocation - row.safetyBuffer)
                        const isDropdownOpen = activeDropdownId === row.productId
                        const groupedBadges = getGroupedMarketplaceBadges(row.channels)

                        return (
                          <tr key={row.productId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            
                            {/* SKU / Title */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">{row.title || row.sku}</div>
                              <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">{row.sku}</div>
                            </td>

                            {/* Push Qty */}
                            <td className="py-3.5 px-3 text-center">
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                                {calculatedFbm}
                              </span>
                            </td>

                            {/* Grouped Platform Pills */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                {row.channels.length === 0 ? (
                                  <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-900">
                                    ⚠️ No Marketplaces Active
                                  </span>
                                ) : (
                                  groupedBadges.map((group) => (
                                    <span
                                      key={group.channel}
                                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border shadow-2xs ${group.badgeStyle}`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${group.dotStyle}`} />
                                      <span>{group.channel}</span>
                                      <span className="text-[10px] font-extrabold tracking-wider bg-black/10 dark:bg-white/20 px-1.5 py-0.5 rounded-md ml-0.5">
                                        {group.regions.join(' · ')}
                                      </span>
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>

                            {/* Configure Popover Button */}
                            <td className="py-3.5 px-4 text-right relative">
                              <button
                                type="button"
                                onClick={() => setActiveDropdownId(isDropdownOpen ? null : row.productId)}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xs transition-all"
                              >
                                <span>Target ({row.channels.length}/{MARKETPLACE_ACCOUNTS.length})</span>
                                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>

                              {/* Popover Menu */}
                              {isDropdownOpen && (
                                <div className="absolute right-4 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 p-3 space-y-3 text-left ring-1 ring-black/10">
                                  
                                  {/* Select All / Clear Header */}
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Target Accounts</span>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleSelectAllChannels(idx, true)}
                                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                      >
                                        Select All
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectAllChannels(idx, false)}
                                        className="text-[11px] font-bold text-slate-400 hover:underline"
                                      >
                                        Clear
                                      </button>
                                    </div>
                                  </div>

                                  {/* Explicit Grouped Account List */}
                                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                    
                                    {/* USA Accounts */}
                                    <div>
                                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 px-1">
                                        🇺🇸 United States
                                      </div>
                                      <div className="space-y-1">
                                        {MARKETPLACE_ACCOUNTS.filter((m) => m.region === 'US').map((m) => {
                                          const isChecked = row.channels.includes(m.id)
                                          return (
                                            <label
                                              key={m.id}
                                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold transition-all ${
                                                isChecked
                                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${m.dotStyle}`} />
                                                <span>{m.name}</span>
                                              </div>
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleChannelToggle(idx, m.id)}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                              />
                                            </label>
                                          )
                                        })}
                                      </div>
                                    </div>

                                    {/* Canada Accounts */}
                                    <div>
                                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 px-1">
                                        🇨🇦 Canada
                                      </div>
                                      <div className="space-y-1">
                                        {MARKETPLACE_ACCOUNTS.filter((m) => m.region === 'CA').map((m) => {
                                          const isChecked = row.channels.includes(m.id)
                                          return (
                                            <label
                                              key={m.id}
                                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold transition-all ${
                                                isChecked
                                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${m.dotStyle}`} />
                                                <span>{m.name}</span>
                                              </div>
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleChannelToggle(idx, m.id)}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                              />
                                            </label>
                                          )
                                        })}
                                      </div>
                                    </div>

                                    {/* Mexico Accounts */}
                                    <div>
                                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 px-1">
                                        🇲🇽 Mexico
                                      </div>
                                      <div className="space-y-1">
                                        {MARKETPLACE_ACCOUNTS.filter((m) => m.region === 'MX').map((m) => {
                                          const isChecked = row.channels.includes(m.id)
                                          return (
                                            <label
                                              key={m.id}
                                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold transition-all ${
                                                isChecked
                                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${m.dotStyle}`} />
                                                <span>{m.name}</span>
                                              </div>
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleChannelToggle(idx, m.id)}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                              />
                                            </label>
                                          )
                                        })}
                                      </div>
                                    </div>

                                  </div>
                                </div>
                              )}
                            </td>

                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

          </div>

          {/* Drawer Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">
              Step {currentStep} of 2
            </div>

            <div className="flex items-center gap-3">
              {currentStep === 1 ? (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleProceedToStep2}>
                    Continue to Target Marketplaces
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Back to Allocation
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleExecutePush} 
                    disabled={isSubmitting || isPushing}
                  >
                    {isSubmitting || isPushing ? 'Syncing Marketplaces...' : 'Execute Live Push to Marketplaces'}
                  </Button>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}