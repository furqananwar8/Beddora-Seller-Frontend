'use client'

import AmazonIcon from '@/components/icons/amazon'
import { Button } from '@/design-system/buttons'
import { Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface AmazonAuthModalProps {
  isOpen: boolean
  onSuccess: () => void
}

export function AmazonAuthModal({ isOpen, onSuccess }: AmazonAuthModalProps) {
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleLogin = async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/auth/amazon/login', {
        credentials: 'include',
        })

      if (!res.ok) {
        throw new Error(`Failed to get auth URL: ${res.status}`)
      }

      const { data } = await res.json()
      const authUrl = data?.authorizationUrl

      if (!authUrl) {
        throw new Error('No authorization URL returned')
      }

      // Center popup on screen
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const popup = window.open(
        authUrl,
        'AmazonAuth',
        `width=${width},height=${height},left=${left},top=${top},popup=1,resizable=yes,scrollbars=yes`
      )

      if (!popup) {
        toast.error('Popup blocked. Please allow popups for this site.')
        setLoading(false)
        return
      }

      // Listen for message from popup callback page
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (event.data?.type !== 'AMAZON_AUTH_CALLBACK') return

        window.removeEventListener('message', handleMessage)

        if (event.data.success) {
          onSuccess()
        } else {
          const errorCode = event.data.error
          const message = event.data.message || 'Authentication failed'

          switch (errorCode) {
            case 'NOT_INVITED':
              toast.error('Access Denied', {
                description: message,
                duration: 6000,
              })
              break
            case 'INVALID_STATE':
              toast.error('Security Error', {
                description: message,
                duration: 4000,
              })
              break
            default:
              toast.error('Authentication Failed', {
                description: message,
                duration: 4000,
              })
          }
        }

        setLoading(false)
      }

      window.addEventListener('message', handleMessage)

      // Detect if user manually closes popup
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          setLoading(false)
        }
      }, 500)
    } catch (err) {
      toast.error('Failed to start Amazon login. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Connect Amazon Advertising
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            Login with your Amazon account to manage campaigns
          </p>
        </div>

        <div className="mt-8">
          <Button
            onClick={handleLogin}
            disabled={loading}
            size="lg"
            className="bg-[#FF9900] text-black hover:bg-[#FF9900]/90 border-transparent dark:bg-[#FF9900] dark:text-black dark:hover:bg-[#FF9900]/80 w-full h-12 text-lg font-semibold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <AmazonIcon />
                Continue with Amazon
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}