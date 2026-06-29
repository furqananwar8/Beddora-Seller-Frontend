'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Alert } from '@/design-system/alerts'
import { Footer } from '@/components/layout'
import { SUPPORT_EMAILS, BUSINESS_HOURS } from '@/utils/constants'

/**
 * Contact / Support Page
 * 
 * Public page required by Amazon for SP-API compliance
 * Must be accessible without authentication
 */
export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    // Simulate form submission (replace with actual API call)
    try {
      // TODO: Implement actual contact form submission API
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSubmitStatus('success')
      setFormData({ name: '', email: '', subject: '', message: '', category: 'general' })
    } catch (error) {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contact & Support</h1>
          <p className="text-gray-600">We&apos;re here to help. Get in touch with our support team.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Reach out to us through any of these channels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">General Support</h3>
                  <p className="text-gray-600">Email: <a href={`mailto:${SUPPORT_EMAILS.SUPPORT}`} className="text-blue-600 hover:underline">{SUPPORT_EMAILS.SUPPORT}</a></p>
                  <p className="text-gray-600">Response time: Within 24 hours</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Privacy & Data Protection</h3>
                  <p className="text-gray-600">Email: <a href={`mailto:${SUPPORT_EMAILS.PRIVACY}`} className="text-blue-600 hover:underline">{SUPPORT_EMAILS.PRIVACY}</a></p>
                  <p className="text-gray-600">For data deletion requests and privacy inquiries</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Legal & Compliance</h3>
                  <p className="text-gray-600">Email: <a href={`mailto:${SUPPORT_EMAILS.LEGAL}`} className="text-blue-600 hover:underline">{SUPPORT_EMAILS.LEGAL}</a></p>
                  <p className="text-gray-600">For legal matters and compliance questions</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Amazon SP-API Support</h3>
                  <p className="text-gray-600">Email: <a href={`mailto:${SUPPORT_EMAILS.AMAZON_SUPPORT}`} className="text-blue-600 hover:underline">{SUPPORT_EMAILS.AMAZON_SUPPORT}</a></p>
                  <p className="text-gray-600">For Amazon integration and API-related issues</p>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-gray-900 mb-2">Business Hours</h3>
                  <p className="text-gray-600">{BUSINESS_HOURS.WEEKDAYS}</p>
                  <p className="text-gray-600">{BUSINESS_HOURS.WEEKEND}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/privacy" className="block text-blue-600 hover:text-blue-700">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="block text-blue-600 hover:text-blue-700">
                  Terms of Service
                </Link>
                <Link href="/data-retention" className="block text-blue-600 hover:text-blue-700">
                  Data Retention & Deletion Policy
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <CardDescription>Fill out the form below and we&apos;ll get back to you as soon as possible</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing Question</option>
                    <option value="amazon">Amazon SP-API Issue</option>
                    <option value="privacy">Privacy Request</option>
                    <option value="feature">Feature Request</option>
                    <option value="bug">Bug Report</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <Input
                    id="subject"
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    placeholder="Brief subject line"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Please provide details about your inquiry..."
                  />
                </div>

                {submitStatus === 'success' && (
                  <Alert variant="success">
                    Thank you! Your message has been sent. We&apos;ll get back to you within 24 hours.
                  </Alert>
                )}

                {submitStatus === 'error' && (
                  <Alert variant="danger">
                    There was an error sending your message. Please try again or email us directly.
                  </Alert>
                )}

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How do I disconnect my Amazon account?</h3>
                <p className="text-gray-600">
                  You can disconnect your Amazon account at any time by going to Settings → Amazon Accounts and
                  clicking &quot;Disconnect&quot;. All associated data will be deleted within 7 days.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How do I request data deletion?</h3>
                <p className="text-gray-600">
                  You can request data deletion by disconnecting your Amazon account, deleting your Beddora account, or
                  emailing us at <a href={`mailto:${SUPPORT_EMAILS.PRIVACY}`} className="text-blue-600 hover:underline">{SUPPORT_EMAILS.PRIVACY}</a>.
                  See our <Link href="/data-retention" className="text-blue-600 hover:underline">Data Retention Policy</Link> for details.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Is my Amazon data secure?</h3>
                <p className="text-gray-600">
                  Yes. All sensitive data is encrypted using AES-256-CBC before storage. We implement multi-seller
                  isolation to ensure your data is only accessible to your account. See our{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> for more details.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What happens if I delete my account?</h3>
                <p className="text-gray-600">
                  All your data, including Amazon account connections, sync data, and account information, will be
                  permanently deleted within 30 days. This action cannot be undone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
