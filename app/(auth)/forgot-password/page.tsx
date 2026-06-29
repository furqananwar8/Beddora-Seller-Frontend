'use client'

import React from 'react'
import { ForgotPasswordForm } from '@/features/auth'
import { Container } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'

/**
 * Forgot password page
 */
export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <Container size="sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Reset your password</CardTitle>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
          </CardContent>
        </Card>
      </Container>
    </div>
  )
}
