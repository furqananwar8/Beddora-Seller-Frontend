'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Footer } from '@/components/layout'
import { SUPPORT_EMAILS, COMPANY_INFO } from '@/utils/constants'

/**
 * Terms of Service Page
 * 
 * Public page required by Amazon for SP-API compliance
 * Must be accessible without authentication
 */
export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="space-y-6 text-gray-700">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                <p>
                  By accessing or using Beddora&apos;s services, including our Amazon Selling Partner API (SP-API)
                  integration, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these
                  Terms, you may not use our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
                <p>
                  Beddora provides a SaaS platform that integrates with Amazon&apos;s Selling Partner API to help sellers
                  manage their Amazon business operations, including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Order management and synchronization</li>
                  <li>Inventory tracking and management</li>
                  <li>Financial data analysis and reporting</li>
                  <li>PPC campaign management and optimization</li>
                  <li>Product listing management</li>
                  <li>Profit analysis and business insights</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Amazon SP-API Terms</h2>
                <p>
                  Your use of our Amazon SP-API integration is subject to Amazon&apos;s Selling Partner API Developer Guide
                  and Data Protection Policy. By using our service, you acknowledge that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You are authorized to grant us access to your Amazon Seller Central account</li>
                  <li>You will comply with all Amazon policies and terms of service</li>
                  <li>You are responsible for maintaining the security of your Amazon account credentials</li>
                  <li>We will access your Amazon data only as necessary to provide our services</li>
                  <li>You can revoke our access to your Amazon account at any time</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Accounts and Registration</h2>
                <p>To use our services, you must:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Create an account with accurate and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Be at least 18 years old or have parental consent</li>
                  <li>Have the legal authority to bind your business to these Terms</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Acceptable Use</h2>
                <p>You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use our services for any illegal or unauthorized purpose</li>
                  <li>Violate any laws, regulations, or third-party rights</li>
                  <li>Interfere with or disrupt our services or servers</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Use automated systems to access our services without permission</li>
                  <li>Share your account credentials with others</li>
                  <li>Reverse engineer or attempt to extract our source code</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data and Privacy</h2>
                <p>
                  Your use of our services is also governed by our Privacy Policy. By using our services, you consent
                  to the collection, use, and disclosure of your data as described in our Privacy Policy.
                </p>
                <p className="mt-2">
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    View our Privacy Policy
                  </Link>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Intellectual Property</h2>
                <p>
                  All content, features, and functionality of our services are owned by Beddora and are protected by
                  international copyright, trademark, and other intellectual property laws. You may not copy, modify,
                  distribute, or create derivative works without our express written permission.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Service Availability</h2>
                <p>
                  We strive to provide reliable service but do not guarantee that our services will be available 100% of
                  the time. We may experience downtime due to maintenance, updates, or unforeseen circumstances. We are
                  not liable for any losses resulting from service unavailability.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Fees and Payment</h2>
                <p>
                  Some features of our service may require payment. By subscribing to paid features, you agree to pay
                  the fees specified at the time of purchase. Fees are non-refundable unless otherwise stated. We
                  reserve the right to change our pricing with 30 days&apos; notice.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Termination</h2>
                <p>We may terminate or suspend your account and access to our services immediately, without prior notice, if:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You breach these Terms</li>
                  <li>You violate any applicable laws or regulations</li>
                  <li>You engage in fraudulent or harmful activities</li>
                  <li>You fail to pay required fees</li>
                </ul>
                <p className="mt-2">
                  You may terminate your account at any time by disconnecting your Amazon account and contacting us to
                  delete your data.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Disclaimers</h2>
                <p>
                  Our services are provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express
                  or implied. We do not guarantee that our services will be error-free, uninterrupted, or secure. We
                  are not responsible for any losses or damages resulting from your use of our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by law, Beddora shall not be liable for any indirect, incidental,
                  special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred
                  directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Indemnification</h2>
                <p>
                  You agree to indemnify and hold harmless Beddora, its officers, directors, employees, and agents from
                  any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of your use
                  of our services or violation of these Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Governing Law</h2>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of {COMPANY_INFO.JURISDICTION},
                  without regard to its conflict of law provisions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Changes to Terms</h2>
                <p>
                  We reserve the right to modify these Terms at any time. We will notify you of any material changes by
                  posting the updated Terms on this page and updating the &quot;Last updated&quot; date. Your continued use of
                  our services after such changes constitutes acceptance of the new Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Contact Information</h2>
                <p>If you have questions about these Terms, please contact us:</p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold">Beddora Support</p>
                  <p>Email: <a href={`mailto:${SUPPORT_EMAILS.LEGAL}`} className="text-blue-600 hover:underline">{SUPPORT_EMAILS.LEGAL}</a></p>
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
