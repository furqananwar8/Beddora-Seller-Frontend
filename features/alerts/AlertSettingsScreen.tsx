'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Input, Select } from '@/design-system/inputs'

type AlertCategory = 'product' | 'financial' | 'performance' | 'inventory' | 'advertising'

interface AlertSetting {
  id: string
  name: string
  priority: 'major' | 'minor' | 'multiple'
  notificationSellerboard: boolean
  notificationSellerCentral: boolean
  notificationEmail: boolean
  recipients: string
}

export const AlertSettingsScreen = React.memo(() => {
  const [activeTab, setActiveTab] = useState<'configure' | 'exclude'>('configure')
  const [expandedCategories, setExpandedCategories] = useState<Set<AlertCategory>>(new Set())

  const [productAlerts, setProductAlerts] = useState<AlertSetting[]>([
    { id: 'p1', name: 'ASIN lost parent', priority: 'minor', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: false, recipients: '' },
    { id: 'p2', name: 'Brand changed', priority: 'major', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: true, recipients: '' },
    { id: 'p3', name: 'Category changed', priority: 'minor', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: false, recipients: '' },
    { id: 'p4', name: 'Dimensions changed', priority: 'minor', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: false, recipients: '' },
    { id: 'p5', name: 'Listing closed', priority: 'major', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: true, recipients: '' },
    { id: 'p6', name: 'Listing text changed', priority: 'major', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: false, recipients: '' },
    { id: 'p7', name: 'Listing title changed', priority: 'major', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: true, recipients: '' },
    { id: 'p8', name: 'Main image changed', priority: 'major', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: false, recipients: '' },
    { id: 'p9', name: 'New parent or child', priority: 'minor', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: false, recipients: '' },
    { id: 'p10', name: 'Number of sellers/SKU\'s on a listing changed', priority: 'minor', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: false, recipients: '' },
  ])

  const [financialAlerts, setFinancialAlerts] = useState<AlertSetting[]>([
    { id: 'f1', name: 'Price changed', priority: 'multiple', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: true, recipients: '' },
    { id: 'f2', name: 'FBA fees changed', priority: 'minor', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: false, recipients: '' },
  ])

  const [performanceAlerts, setPerformanceAlerts] = useState<AlertSetting[]>([
    { id: 'pf1', name: 'Sales rank changed significantly', priority: 'multiple', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: true, recipients: '' },
    { id: 'pf2', name: 'Rating dropped', priority: 'major', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: true, recipients: '' },
    { id: 'pf3', name: 'Number of reviews changed', priority: 'minor', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: false, recipients: '' },
  ])

  const [inventoryAlerts, setInventoryAlerts] = useState<AlertSetting[]>([
    { id: 'i1', name: 'Running out of stock', priority: 'major', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: true, recipients: '' },
    { id: 'i2', name: 'Time to reorder', priority: 'major', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: true, recipients: '' },
    { id: 'i3', name: 'Excess inventory', priority: 'minor', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: false, recipients: '' },
  ])

  const [advertisingAlerts, setAdvertisingAlerts] = useState<AlertSetting[]>([
    { id: 'a1', name: 'Campaign performance alerts', priority: 'minor', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: true, recipients: '' },
    { id: 'a2', name: 'Keyword bid recommendations', priority: 'minor', notificationSellerboard: true, notificationSellerCentral: false, notificationEmail: false, recipients: '' },
  ])

  const toggleCategory = (category: AlertCategory) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const updateAlert = (category: AlertCategory, id: string, field: keyof AlertSetting, value: any) => {
    const setters = {
      product: setProductAlerts,
      financial: setFinancialAlerts,
      performance: setPerformanceAlerts,
      inventory: setInventoryAlerts,
      advertising: setAdvertisingAlerts,
    }
    
    setters[category]((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, [field]: value } : alert))
    )
  }

  const renderAlertRows = (category: AlertCategory, alerts: AlertSetting[]) => {
    return alerts.map((alert) => (
      <div key={alert.id} className="grid grid-cols-12 gap-4 p-4 border-t border-border items-center hover:bg-surface-secondary">
        <div className="col-span-3 flex items-center gap-2">
          <span className="text-sm">{alert.name}</span>
          <button className="text-text-muted hover:text-text-primary">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </button>
        </div>
        <div className="col-span-2">
          <Select
            value={alert.priority}
            onChange={(e) => updateAlert(category, alert.id, 'priority', e.target.value)}
            options={[
              { value: 'major', label: 'Major' },
              { value: 'minor', label: 'Minor' },
              { value: 'multiple', label: 'Multiple values' },
            ]}
            className="w-full text-sm"
          />
        </div>
        <div className="col-span-1 flex justify-center">
          <input
            type="checkbox"
            checked={alert.notificationSellerboard}
            onChange={(e) => updateAlert(category, alert.id, 'notificationSellerboard', e.target.checked)}
            className="w-4 h-4"
          />
        </div>
        <div className="col-span-1 flex justify-center">
          <input
            type="checkbox"
            checked={alert.notificationSellerCentral}
            onChange={(e) => updateAlert(category, alert.id, 'notificationSellerCentral', e.target.checked)}
            className="w-4 h-4"
            disabled
          />
        </div>
        <div className="col-span-1 flex justify-center">
          <input
            type="checkbox"
            checked={alert.notificationEmail}
            onChange={(e) => updateAlert(category, alert.id, 'notificationEmail', e.target.checked)}
            className="w-4 h-4"
          />
        </div>
        <div className="col-span-3">
          <Input
            type="text"
            value={alert.recipients}
            onChange={(e) => updateAlert(category, alert.id, 'recipients', e.target.value)}
            placeholder="Enter emails to overwrite the default address"
            className="w-full text-sm"
          />
        </div>
      </div>
    ))
  }

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Alert Settings</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('configure')}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors text-sm ${
              activeTab === 'configure'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Configure alert types
          </button>
          <button
            onClick={() => setActiveTab('exclude')}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors text-sm ${
              activeTab === 'exclude'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Exclude products/marketplaces
          </button>
        </div>
      </div>

      {/* Configure Alert Types Tab */}
      {activeTab === 'configure' && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 bg-surface-secondary border-b border-border text-sm font-medium">
            <div className="col-span-3">Category/Event</div>
            <div className="col-span-2">Priority</div>
            <div className="col-span-1 text-center">Notification in<br />sellerboard</div>
            <div className="col-span-1 text-center">Notification in<br />Seller Central</div>
            <div className="col-span-1 text-center">Notification<br />per E-Mail</div>
            <div className="col-span-3">Recipients list
              <button className="ml-2 inline-block align-middle">
                <svg className="w-4 h-4 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Product Alerts Section */}
          <div className="border-b border-border">
            <div className="grid grid-cols-12 gap-4 p-4 items-center bg-surface">
              <div className="col-span-3">
                <button
                  onClick={() => toggleCategory('product')}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedCategories.has('product') ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium">Product alerts</span>
                </button>
              </div>
              <div className="col-span-2">
                <Select
                  value="multiple"
                  onChange={() => {}}
                  options={[
                    { value: 'multiple', label: 'Multiple values' },
                  ]}
                  className="w-full text-sm"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={true} onChange={() => {}} className="w-4 h-4" />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={false} onChange={() => {}} className="w-4 h-4" disabled />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={true} onChange={() => {}} className="w-4 h-4" />
              </div>
              <div className="col-span-3">
                <Input
                  type="text"
                  value=""
                  onChange={() => {}}
                  placeholder="Enter emails to overwrite the default address"
                  className="w-full text-sm"
                />
              </div>
            </div>

            {expandedCategories.has('product') && (
              <div>
                {renderAlertRows('product', productAlerts)}
              </div>
            )}
          </div>

          {/* Financial Alerts Section */}
          <div className="border-b border-border">
            <div className="grid grid-cols-12 gap-4 p-4 items-center bg-surface">
              <div className="col-span-3">
                <button
                  onClick={() => toggleCategory('financial')}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedCategories.has('financial') ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium">Financial alerts</span>
                </button>
              </div>
              <div className="col-span-2">
                <Select
                  value="multiple"
                  onChange={() => {}}
                  options={[
                    { value: 'multiple', label: 'Multiple values' },
                  ]}
                  className="w-full text-sm"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={true} onChange={() => {}} className="w-4 h-4" />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={false} onChange={() => {}} className="w-4 h-4" disabled />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={true} onChange={() => {}} className="w-4 h-4" />
              </div>
              <div className="col-span-3">
                <Input
                  type="text"
                  value=""
                  onChange={() => {}}
                  placeholder="Enter emails to overwrite the default address"
                  className="w-full text-sm"
                />
              </div>
            </div>

            {expandedCategories.has('financial') && (
              <div>
                {renderAlertRows('financial', financialAlerts)}
              </div>
            )}
          </div>

          {/* Performance Alerts Section */}
          <div className="border-b border-border">
            <div className="grid grid-cols-12 gap-4 p-4 items-center bg-surface">
              <div className="col-span-3">
                <button
                  onClick={() => toggleCategory('performance')}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedCategories.has('performance') ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium">Performance alerts</span>
                </button>
              </div>
              <div className="col-span-2">
                <Select
                  value="multiple"
                  onChange={() => {}}
                  options={[
                    { value: 'multiple', label: 'Multiple values' },
                  ]}
                  className="w-full text-sm"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={true} onChange={() => {}} className="w-4 h-4" />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={false} onChange={() => {}} className="w-4 h-4" disabled />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={true} onChange={() => {}} className="w-4 h-4" />
              </div>
              <div className="col-span-3">
                <Input
                  type="text"
                  value=""
                  onChange={() => {}}
                  placeholder="Enter emails to overwrite the default address"
                  className="w-full text-sm"
                />
              </div>
            </div>

            {expandedCategories.has('performance') && (
              <div>
                {renderAlertRows('performance', performanceAlerts)}
              </div>
            )}
          </div>

          {/* Inventory Alerts Section */}
          <div className="border-b border-border">
            <div className="grid grid-cols-12 gap-4 p-4 items-center bg-surface">
              <div className="col-span-3">
                <button
                  onClick={() => toggleCategory('inventory')}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedCategories.has('inventory') ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium">Inventory alerts</span>
                </button>
              </div>
              <div className="col-span-2">
                <Select
                  value="major"
                  onChange={() => {}}
                  options={[
                    { value: 'major', label: 'Major' },
                  ]}
                  className="w-full text-sm"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={true} onChange={() => {}} className="w-4 h-4" />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={false} onChange={() => {}} className="w-4 h-4" disabled />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={true} onChange={() => {}} className="w-4 h-4" />
              </div>
              <div className="col-span-3">
                <Input
                  type="text"
                  value=""
                  onChange={() => {}}
                  placeholder="Enter emails to overwrite the default address"
                  className="w-full text-sm"
                />
              </div>
            </div>

            {expandedCategories.has('inventory') && (
              <div>
                {renderAlertRows('inventory', inventoryAlerts)}
              </div>
            )}
          </div>

          {/* Amazon Advertising Recommendations Section */}
          <div>
            <div className="grid grid-cols-12 gap-4 p-4 items-center bg-surface">
              <div className="col-span-3">
                <button
                  onClick={() => toggleCategory('advertising')}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedCategories.has('advertising') ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium">Amazon advertising recommendations</span>
                </button>
              </div>
              <div className="col-span-2">
                <Select
                  value="minor"
                  onChange={() => {}}
                  options={[
                    { value: 'minor', label: 'Minor' },
                  ]}
                  className="w-full text-sm"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={true} onChange={() => {}} className="w-4 h-4" />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={false} onChange={() => {}} className="w-4 h-4" disabled />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={true} onChange={() => {}} className="w-4 h-4" />
              </div>
              <div className="col-span-3">
                <Input
                  type="text"
                  value=""
                  onChange={() => {}}
                  placeholder="Enter emails to overwrite the default address"
                  className="w-full text-sm"
                />
              </div>
            </div>

            {expandedCategories.has('advertising') && (
              <div>
                {renderAlertRows('advertising', advertisingAlerts)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exclude Products/Marketplaces Tab */}
      {activeTab === 'exclude' && (
        <div className="max-w-2xl">
          {/* Don't send alerts for these marketplaces */}
          <div className="mb-8">
            <h3 className="text-base font-normal text-text-primary mb-3">
              Don't send alerts for these marketplaces
            </h3>
            <Select
              value=""
              onChange={() => {}}
              options={[
                { value: '', label: 'Select marketplaces' },
                { value: 'amazon-us', label: 'Amazon.com (US)' },
                { value: 'amazon-ca', label: 'Amazon.ca (Canada)' },
                { value: 'amazon-uk', label: 'Amazon.co.uk (UK)' },
                { value: 'amazon-de', label: 'Amazon.de (Germany)' },
              ]}
              className="w-full max-w-md"
            />
          </div>

          {/* Don't send alerts for these products */}
          <div className="mb-8">
            <h3 className="text-base font-normal text-text-primary mb-3">
              Don't send alerts for these products
            </h3>
            <Select
              value=""
              onChange={() => {}}
              options={[
                { value: '', label: 'Select products' },
              ]}
              className="w-full max-w-md"
            />
          </div>

          {/* Save Button */}
          <div className="fixed bottom-8 right-8">
            <button className="px-6 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors">
              Save
            </button>
          </div>
        </div>
      )}
    </Container>
  )
})

AlertSettingsScreen.displayName = 'AlertSettingsScreen'
