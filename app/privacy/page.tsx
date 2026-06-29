'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Footer } from '@/components/layout'
import { SUPPORT_EMAILS } from '@/utils/constants'

/**
 * Privacy Policy Page (SP-API Specific)
 * 
 * Public page required by Amazon for SP-API compliance
 * Must be accessible without authentication
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Amazon SP-API Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="space-y-6 text-gray-700">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
                <p>
                  Beddora (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains
                  how we collect, use, disclose, and safeguard your information when you use our Amazon Selling Partner
                  API (SP-API) integration services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Amazon SP-API Data</h3>
                <p>When you connect your Amazon Seller Central account, we collect:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Order information (order IDs, dates, amounts, customer information)</li>
                  <li>Product data (ASINs, SKUs, titles, prices, inventory levels)</li>
                  <li>Financial data (fees, settlements, refunds, reimbursements)</li>
                  <li>Advertising data (PPC campaigns, keywords, performance metrics)</li>
                  <li>Inventory data (FBA inventory levels, inbound shipments, reserved quantities)</li>
                  <li>Listing data (product listings, buy box status, competitor information)</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.2 Authentication Credentials</h3>
                <p>We securely store and encrypt:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>LWA (Login with Amazon) Client ID and Client Secret</li>
                  <li>Refresh tokens (encrypted using AES-256-CBC)</li>
                  <li>IAM role ARN for AWS authentication</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.3 Account Information</h3>
                <p>We collect account information including:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Amazon Seller ID</li>
                  <li>Marketplace IDs</li>
                  <li>Account status and connection metadata</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
                <p>We use the collected information to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide Amazon SP-API integration services</li>
                  <li>Sync and process your Amazon seller data</li>
                  <li>Generate reports, analytics, and insights</li>
                  <li>Manage your account and provide customer support</li>
                  <li>Comply with legal obligations and Amazon&apos;s requirements</li>
                  <li>Improve our services and develop new features</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
                <p>We do not sell, trade, or rent your personal information. We may share data only:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>With Amazon:</strong> As required by the SP-API terms of service and for API authentication
                  </li>
                  <li>
                    <strong>Service Providers:</strong> With trusted third-party services that help us operate our
                    platform (hosting, analytics, customer support)
                  </li>
                  <li>
                    <strong>Legal Requirements:</strong> When required by law, court order, or government regulation
                  </li>
                  <li>
                    <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
                <p>We implement industry-standard security measures:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Encryption:</strong> All sensitive data (tokens, secrets) are encrypted using AES-256-CBC
                    before storage
                  </li>
                  <li>
                    <strong>Access Controls:</strong> Multi-seller isolation ensures your data is only accessible to
                    your account
                  </li>
                  <li>
                    <strong>Secure Transmission:</strong> All API communications use HTTPS/TLS encryption
                  </li>
                  <li>
                    <strong>Token Management:</strong> Secure token storage with automatic rotation and expiration
                    handling
                  </li>
                  <li>
                    <strong>Audit Logging:</strong> Comprehensive audit logs for all credential and data access
                    operations
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
                <p>
                  We retain your data for as long as necessary to provide our services and comply with legal
                  obligations. You can request data deletion at any time (see Data Deletion Policy).
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Active account data: Retained while your account is active</li>
                  <li>Historical sync data: Retained for up to 2 years for reporting purposes</li>
                  <li>Account credentials: Retained until account disconnection</li>
                  <li>Audit logs: Retained for 1 year for security and compliance</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request data deletion</li>
                  <li>Disconnect your Amazon account at any time</li>
                  <li>Export your data</li>
                  <li>Opt-out of certain data processing</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Amazon SP-API Compliance</h2>
                <p>
                  Our use of Amazon SP-API data complies with Amazon&apos;s Selling Partner API Developer Guide and Data
                  Protection Policy. We:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Only access data necessary for providing our services</li>
                  <li>Do not share Amazon data with unauthorized third parties</li>
                  <li>Implement security measures required by Amazon</li>
                  <li>Respect rate limits and API usage guidelines</li>
                  <li>Handle token rotation and refresh securely</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Cookies and Tracking</h2>
                <p>
                  We use cookies and similar technologies to provide, maintain, and improve our services. You can
                  control cookies through your browser settings.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children&apos;s Privacy</h2>
                <p>
                  Our services are not intended for individuals under 18 years of age. We do not knowingly collect
                  personal information from children.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. International Data Transfers</h2>
                <p>
                  Your data may be transferred to and processed in countries other than your country of residence. We
                  ensure appropriate safeguards are in place to protect your data.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by
                  posting the new policy on this page and updating the &quot;Last updated&quot; date.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
                <p>
                  If you have questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold">Beddora Support</p>
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
