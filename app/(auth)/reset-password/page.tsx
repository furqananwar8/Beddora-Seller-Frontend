'use client'

import React, { Suspense } from 'react'
import { ResetPasswordForm } from '@/features/auth'
import { Container } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'

/**
 * Reset password page
 */
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <Container size="sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Reset your password</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="flex justify-center py-12"><Spinner /></div>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
      </Container>
    </div>
  )
}
