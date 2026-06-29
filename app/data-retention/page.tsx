'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Footer } from '@/components/layout'
import { SUPPORT_EMAILS } from '@/utils/constants'

/**
 * Data Retention & Deletion Policy Page
 * 
 * Public page required by Amazon for SP-API compliance
 * Must be accessible without authentication
 */
export default function DataRetentionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Data Retention & Deletion Policy</h1>
          <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Data Retention & Deletion Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="space-y-6 text-gray-700">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Overview</h2>
                <p>
                  This Data Retention & Deletion Policy explains how Beddora retains and deletes your data, including
                  data collected through our Amazon Selling Partner API (SP-API) integration. We are committed to
                  transparency about our data practices and your rights regarding your data.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Data Retention Periods</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Account Data</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Active Accounts:</strong> Data is retained while your account is active and in use</li>
                  <li><strong>Inactive Accounts:</strong> Data is retained for 90 days after last activity</li>
                  <li><strong>Deleted Accounts:</strong> Data is permanently deleted within 30 days of account deletion request</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.2 Amazon SP-API Data</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Order Data:</strong> Retained for 2 years from the date of sync</li>
                  <li><strong>Product Data:</strong> Retained for 1 year from last update</li>
                  <li><strong>Inventory Data:</strong> Retained for 1 year from last sync</li>
                  <li><strong>Financial Data:</strong> Retained for 3 years for accounting and compliance purposes</li>
                  <li><strong>PPC Data:</strong> Retained for 2 years from the date of sync</li>
                  <li><strong>Listing Data:</strong> Retained for 1 year from last update</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.3 Authentication Credentials</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Active Connections:</strong> Credentials are retained while the Amazon account is connected</li>
                  <li><strong>Disconnected Accounts:</strong> Credentials are deleted immediately upon disconnection</li>
                  <li><strong>Token Cache:</strong> Cached tokens are automatically deleted after expiration (typically 1 hour)</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.4 Sync Logs and Audit Data</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Sync Logs:</strong> Retained for 1 year</li>
                  <li><strong>Audit Logs:</strong> Retained for 1 year for security and compliance</li>
                  <li><strong>Error Logs:</strong> Retained for 90 days</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.5 User Account Information</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Profile Data:</strong> Retained while account is active</li>
                  <li><strong>Billing Information:</strong> Retained for 7 years for tax and accounting compliance</li>
                  <li><strong>Support Communications:</strong> Retained for 2 years</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Data Deletion Process</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Automatic Deletion</h3>
                <p>We automatically delete data when:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Retention periods expire</li>
                  <li>You disconnect your Amazon account</li>
                  <li>Your account is deleted</li>
                  <li>Data is no longer needed for the purpose it was collected</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">3.2 Manual Deletion Requests</h3>
                <p>You can request deletion of your data at any time by:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Disconnecting your Amazon account through the settings page</li>
                  <li>Deleting your Beddora account</li>
                  <li>Contacting our support team at <a href={`mailto:${SUPPORT_EMAILS.PRIVACY}`} className="text-blue-600 hover:underline">{SUPPORT_EMAILS.PRIVACY}</a></li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">3.3 Deletion Timeline</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Immediate:</strong> Authentication credentials, cached tokens</li>
                  <li><strong>Within 24 hours:</strong> Account disconnection, active sync data</li>
                  <li><strong>Within 7 days:</strong> Historical sync data, logs</li>
                  <li><strong>Within 30 days:</strong> Complete account deletion, all associated data</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Deletion Exceptions</h2>
                <p>We may retain certain data beyond the standard retention periods if:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Required by law, regulation, or legal process</li>
                  <li>Necessary for tax, accounting, or financial reporting (financial data retained for 7 years)</li>
                  <li>Needed to resolve disputes or enforce our agreements</li>
                  <li>Required for legitimate business purposes (e.g., fraud prevention)</li>
                  <li>Data has been anonymized or aggregated (no personal identifiers)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Amazon SP-API Data Deletion</h2>
                <p>
                  When you disconnect your Amazon account or request data deletion, we will:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Immediately revoke and delete all authentication credentials</li>
                  <li>Stop all data synchronization from your Amazon account</li>
                  <li>Delete all cached Amazon data within 7 days</li>
                  <li>Remove all Amazon account associations from your Beddora account</li>
                  <li>Delete all sync logs related to your Amazon account</li>
                </ul>
                <p className="mt-2">
                  <strong>Note:</strong> We cannot delete data that remains in your Amazon Seller Central account. You
                  must manage that data directly through Amazon.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Backup and Archive Data</h2>
                <p>
                  We maintain regular backups of our systems for disaster recovery purposes. Deleted data may remain in
                  backups for up to 90 days before being permanently removed. Backup data is encrypted and access is
                  restricted to authorized personnel only.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Request Deletion:</strong> Request deletion of your personal data at any time</li>
                  <li><strong>Data Export:</strong> Request a copy of your data before deletion</li>
                  <li><strong>Account Deletion:</strong> Delete your entire account and all associated data</li>
                  <li><strong>Disconnect Amazon:</strong> Disconnect your Amazon account and delete all Amazon-related data</li>
                  <li><strong>Opt-Out:</strong> Opt-out of certain data collection or processing</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. How to Request Data Deletion</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Option 1: Through Your Account</h3>
                  <ol className="list-decimal pl-6 space-y-2">
                    <li>Log in to your Beddora account</li>
                    <li>Go to Settings → Amazon Accounts</li>
                    <li>Click &quot;Disconnect&quot; next to your Amazon account</li>
                    <li>Confirm the disconnection</li>
                  </ol>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">Option 2: Delete Your Account</h3>
                  <ol className="list-decimal pl-6 space-y-2">
                    <li>Log in to your Beddora account</li>
                    <li>Go to Settings → Account</li>
                    <li>Click &quot;Delete Account&quot;</li>
                    <li>Follow the confirmation steps</li>
                  </ol>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">Option 3: Contact Support</h3>
                  <p>Email us at <a href={`mailto:${SUPPORT_EMAILS.PRIVACY}`} className="text-blue-600 hover:underline font-semibold">{SUPPORT_EMAILS.PRIVACY}</a> with:</p>
                  <ul className="list-disc pl-6 space-y-1 mt-2">
                    <li>Your account email address</li>
                    <li>Specific data you want deleted (or &quot;all data&quot;)</li>
                    <li>Verification of your identity</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Data Deletion Confirmation</h2>
                <p>
                  After processing your deletion request, we will send you a confirmation email. Deletion is typically
                  completed within 7-30 days, depending on the type and volume of data.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Policy</h2>
                <p>
                  We may update this Data Retention & Deletion Policy from time to time. We will notify you of any
                  material changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
                <p>If you have questions about data retention or deletion, please contact us:</p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold">Beddora Privacy Team</p>
                  <p>Email: <a href={`mailto:${SUPPORT_EMAILS.PRIVACY}`} className="text-blue-600 hover:underline">{SUPPORT_EMAILS.PRIVACY}</a></p>
                  <p>Website: <Link href="/contact" className="text-blue-600 hover:underline">Contact Page</Link></p>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
