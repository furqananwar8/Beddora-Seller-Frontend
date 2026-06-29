'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/design-system/buttons'
import { Logo, PromotionalSection, SocialLoginButton } from '@/components/marketing'
import { Footer } from '@/components/layout'
import { marketingFeatures, marketingTestimonial, marketingContent } from '@/components/marketing/marketingData'
import { beddoraFlowSteps } from '@/components/marketing/flowData'

/**
 * Homepage with two-section design
 * Left: Promotional Content + Flow Diagram (merged)
 * Right: CTA Content
 */
export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 overflow-hidden">
      {/* Left Side - Promotional Content with Flow */}
      <PromotionalSection
        logo={<Logo variant="light" />}
        heading={marketingContent.heading}
        subtitle={marketingContent.subtitle}
        features={marketingFeatures}
        testimonial={marketingTestimonial}
        flowSteps={beddoraFlowSteps}
      />

      {/* Right Side - CTA Content */}
      <div className="w-full lg:w-1/2 bg-surface flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12 overflow-y-auto">
          <div className="w-full max-w-md space-y-8">
            {/* Mobile Logo */}
            <div className="lg:hidden">
              <Logo variant="dark" />
            </div>

            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-3">Welcome to Beddora</h2>
              <p className="text-text-muted text-lg">Sign in to your account to continue.</p>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-5">
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Sign in
              </Button>

              {/* Social Login Section - Hidden for now */}
              {/* <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-surface text-text-muted">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SocialLoginButton provider="google" />
                <SocialLoginButton provider="amazon" />
              </div> */}
            </div>

            <div className="pt-4 space-y-4">
              <p className="text-center text-sm text-text-muted">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-primary-600 font-medium hover:text-primary-700 transition-colors">
                  Start free trial
                </Link>
              </p>

              <p className="text-center text-xs text-text-muted leading-relaxed">
                By signing in, you agree to our{' '}
                <Link href="/terms" className="text-primary-600 hover:text-primary-700 transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary-600 hover:text-primary-700 transition-colors">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
      </div>
    </div>
  )
}
