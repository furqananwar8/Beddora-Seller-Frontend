'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Dashboard index – redirects to Profit Dashboard as the app landing screen
 */
export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/profit/dashboard')
  }, [router])

  return null
}

