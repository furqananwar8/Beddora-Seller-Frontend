'use client'

import { SessionsListing } from './session/SessionsListing'

export function BarcodeScreen() {
  return (
    <div className="space-y-5 px-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Scanning Sessions</h1>
        <p className="text-sm text-text-muted">Every scanning session started from Shipments, Shipping orders or Inbound receiving. Scanning itself happens in each screen&apos;s Scan items modal. Returns whose product matches nothing by UPC are entered under Manual Returns.</p>
      </div>
      <SessionsListing />
    </div>
  )
}
