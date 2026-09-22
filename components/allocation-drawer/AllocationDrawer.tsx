"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/design-system/buttons'
import { formatNumber } from '@/utils/format'

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
  channels: string[]
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

const CHANNELS = [
  {
    id: 'shopify',
    name: 'Shopify',
    badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80',
    dot: 'bg-emerald-500',
  },
  {
    id: 'walmart',
    name: 'Walmart',
    badge: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/80',
    dot: 'bg-sky-500',
  },
  {
    id: 'temu',
    name: 'Temu',
    badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80',
    dot: 'bg-amber-500',
  },
  {
    id: 'tiktok',
    name: 'TikTok Shop',
    badge: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80',
    dot: 'bg-rose-500',
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

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown popovers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Initialize or reset drawer state when opened
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
        channels: ['shopify', 'walmart', 'temu', 'tiktok'],
      }))
      setRowStates(initialStates)
    }
  }, [isOpen, productIds, products])

  // Total summary calculation
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
        channels: selectAll ? CHANNELS.map((c) => c.id) : [],
      }
      return updated
    })
  }

  const handleProceedToStep2 = () => {
    setIsStep1Completed(true)
    setCurrentStep(2)
  }

  const handleExecutePush = async () => {
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      if (onConfirmSync) {
        onConfirmSync(rowStates, createFbaInbound)
      }
      onClose()
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dark Overlay Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        {/* Main Panel Drawer */}
        <div className="w-screen max-w-5xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between relative z-10">
          
          {/* Header & Stepper */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Inventory Allocation & Multi-Channel Push
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Allocate stock to lock FBM pool before selecting channel targets[cite: 1].
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Stepper Tabs */}
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

              {/* Locked Step 2 Button */}
              <button
                disabled={!isStep1Completed}
                onClick={() => isStep1Completed && setCurrentStep(2)}
                title={!isStep1Completed ? 'Complete Step 1 Allocation first to unlock target channel selection' : ''}
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
                <span>Step 2: Target Channel Selection & Live Push</span>
              </button>
            </div>
          </div>

          {/* Drawer Body Content */}
          <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-900" ref={dropdownRef}>
            
            {/* Top Summary Metrics Cards */}
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

            {/* STEP 1: ALLOCATION & SP-API FULFILLMENT REQUEST */}
            {currentStep === 1 && (
              <div className="space-y-5">
                
                {/* Information Callout Banner */}
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
                    Allocating units to FBA separates Amazon inbound stock from your central FBM pool[cite: 1].
                    Checking the box below will automatically dispatch an Amazon SP-API <code className="text-blue-600 dark:text-blue-400 font-mono">createInboundPlan</code> request for these SKUs upon confirmation[cite: 1].
                  </div>
                </div>

                {/* SP-API Inbound Request Checkbox Card */}
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
                        Dispatches inbound shipment plans directly to Amazon SP-API for selected SKUs[cite: 1].
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                    {createFbaInbound ? 'SP-API Auto-Request Enabled' : 'Internal Allocation Only'}
                  </span>
                </label>

                {/* Step 1 Allocation Table */}
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

            {/* STEP 2: MULTI-CHANNEL TARGET SELECTION & PUSH */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Target Channel Configurations
                    </h4>
                    <p className="text-xs text-slate-500">
                      Specify which channels receive central stock updates for each SKU[cite: 1].
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                    FBA Units Separated: {totals.fbaAllocation}
                  </span>
                </div>

                {/* Step 2 Channel Selection Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-visible shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4">SKU / Product</th>
                        <th className="py-3.5 px-3 text-center">FBM Push Qty</th>
                        <th className="py-3.5 px-4">Active Target Channels</th>
                        <th className="py-3.5 px-4 text-right">Configure Target Channels</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                      {rowStates.map((row, idx) => {
                        const calculatedFbm = Math.max(0, row.totalStock - row.fbaAllocation - row.safetyBuffer)
                        const isDropdownOpen = activeDropdownId === row.productId

                        return (
                          <tr key={row.productId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            
                            {/* SKU Info */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">{row.title || row.sku}</div>
                              <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">{row.sku}</div>
                            </td>

                            {/* Pushed Qty */}
                            <td className="py-3.5 px-3 text-center">
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                                {calculatedFbm}
                              </span>
                            </td>

                            {/* Sleek Pill Badges */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {row.channels.length === 0 ? (
                                  <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-900">
                                    ⚠️ No Channels Selected
                                  </span>
                                ) : (
                                  CHANNELS.filter((ch) => row.channels.includes(ch.id)).map((ch) => (
                                    <span
                                      key={ch.id}
                                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${ch.badge}`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${ch.dot}`} />
                                      {ch.name}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>

                            {/* Popover Menu */}
                            <td className="py-3.5 px-4 text-right relative">
                              <button
                                type="button"
                                onClick={() => setActiveDropdownId(isDropdownOpen ? null : row.productId)}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xs transition-all"
                              >
                                <span>Configure ({row.channels.length}/{CHANNELS.length})</span>
                                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>

                              {/* Channel Selector Card */}
                              {isDropdownOpen && (
                                <div className="absolute right-4 mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 p-3 space-y-2 text-left ring-1 ring-black/10">
                                  
                                  {/* Quick Select Buttons */}
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Channels</span>
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

                                  {/* Checkbox List */}
                                  <div className="space-y-1">
                                    {CHANNELS.map((ch) => {
                                      const isChecked = row.channels.includes(ch.id)
                                      return (
                                        <label
                                          key={ch.id}
                                          className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs font-bold transition-all ${
                                            isChecked
                                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${ch.dot}`} />
                                            <span>{ch.name}</span>
                                          </div>
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleChannelToggle(idx, ch.id)}
                                            className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500 cursor-pointer"
                                          />
                                        </label>
                                      )
                                    })}
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

          {/* Drawer Footer Controls */}
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
                    Continue to Target Channels
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Back to Allocation
                  </Button>
                  <Button variant="primary" onClick={handleExecutePush} disabled={isSubmitting}>
                    {isSubmitting ? 'Syncing Channels...' : 'Execute Live Push to Channels'}
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