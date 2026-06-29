'use client'

import React from 'react'
import Link from 'next/link'
import { SUPPORT_EMAILS, COMPANY_INFO } from '@/utils/constants'

/**
 * Site-wide Footer Component
 * 
 * Displays footer with compliance links and company information
 * Required by Amazon for SP-API compliance
 */
export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{COMPANY_INFO.NAME}</h3>
            <p className="text-sm text-gray-600 mb-4">
              Amazon SP-API integration platform for sellers. Manage your Amazon business with powerful analytics,
              inventory tracking, and profit insights.
            </p>
            <div className="text-sm text-gray-600">
              <p>© {currentYear} {COMPANY_INFO.NAME}. All rights reserved.</p>
            </div>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/data-retention"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Data Retention Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Support</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAILS.SUPPORT}`}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Support
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAILS.PRIVACY}`}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Privacy Inquiries
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              <p>
                Amazon SP-API compliant. Data processed in accordance with{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
                {' '}and{' '}
                <Link href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>
                .
              </p>
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <Link href="/privacy" className="hover:text-gray-900 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-gray-900 transition-colors">
                Terms
              </Link>
              <Link href="/data-retention" className="hover:text-gray-900 transition-colors">
                Data Policy
              </Link>
              <Link href="/contact" className="hover:text-gray-900 transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
