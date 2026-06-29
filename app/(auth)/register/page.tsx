'use client'

import React from 'react'
import { RegisterForm } from '@/features/auth'
import { Container, Footer } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'

/**
 * Registration page
 */
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <Container size="sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Create your account</CardTitle>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </Container>

      {/* Footer */}
      <Footer />
    </div>
  )
}
