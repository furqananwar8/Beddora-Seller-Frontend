'use client'

import React, { Suspense } from 'react'
import { EmailVerification } from '@/features/auth'
import { Container } from '@/components/layout'
import { Spinner } from '@/design-system/loaders'

/**
 * Email verification page
 */
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <Container size="sm">
        <Suspense fallback={<div className="flex justify-center py-12"><Spinner /></div>}>
          <EmailVerification />
        </Suspense>
      </Container>
    </div>
  )
}
