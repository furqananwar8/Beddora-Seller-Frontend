'use client'

import React, { useState, useEffect } from 'react'
import { useGenerateOAuthUrlQuery, useGetOAuthStatusQuery } from '@/services/api/accounts.api'
import { Button } from '@/design-system/buttons'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { Badge } from '@/design-system/badges'
import { Alert } from '@/design-system/alerts'

/**
 * Amazon Account Authorization Component
 * 
 * Professional Sellerboard-style OAuth authorization component
 */
interface AmazonAccountAuthorizationProps {
  onAuthorized?: () => void
}

export const AmazonAccountAuthorization: React.FC<AmazonAccountAuthorizationProps> = ({
  onAuthorized,
}) => {
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('US')

  const { data: oauthStatus, isLoading: isLoadingStatus } = useGetOAuthStatusQuery()

  const [shouldGenerateUrl, setShouldGenerateUrl] = useState(false)
  const redirectUri = typeof window !== 'undefined' 
    ? `${window.location.origin}/dashboard/settings/amazon/callback`
    : ''

  const {
    data: oauthUrlData,
    isLoading: isLoadingUrl,
    error: urlError,
  } = useGenerateOAuthUrlQuery(
    {
      redirectUri,
      marketplace: selectedMarketplace,
    },
    { skip: !shouldGenerateUrl || !redirectUri }
  )

  useEffect(() => {
    if (oauthUrlData?.authorizationUrl && shouldGenerateUrl) {
      window.location.href = oauthUrlData.authorizationUrl
      setIsAuthorizing(true)
    }
  }, [oauthUrlData, shouldGenerateUrl])

  useEffect(() => {
    if (urlError) {
      setError('Failed to generate authorization URL. Please try again.')
      setIsAuthorizing(false)
      setShouldGenerateUrl(false)
    }
  }, [urlError])

  const handleConnect = () => {
    setError(null)
    setShouldGenerateUrl(true)
  }

  const marketplaceOptions = [
    { value: 'US', label: 'United States', flag: '🇺🇸' },
    { value: 'CA', label: 'Canada', flag: '🇨🇦' },
    { value: 'UK', label: 'United Kingdom', flag: '🇬🇧' },
    { value: 'DE', label: 'Germany', flag: '🇩🇪' },
    { value: 'FR', label: 'France', flag: '🇫🇷' },
    { value: 'IT', label: 'Italy', flag: '🇮🇹' },
    { value: 'ES', label: 'Spain', flag: '🇪🇸' },
    { value: 'JP', label: 'Japan', flag: '🇯🇵' },
    { value: 'AU', label: 'Australia', flag: '🇦🇺' },
  ]

  if (isLoadingStatus) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!oauthStatus?.oauthEnabled) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Amazon Account Authorization</CardTitle>
              <CardDescription className="mt-1">Connect your Amazon Seller Central account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="warning" className="border-orange-200 bg-orange-50">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-orange-900">OAuth Configuration Required</p>
                <p className="text-sm text-orange-800 mt-1">
                  Please configure AMAZON_SP_API_CLIENT_ID in the backend to enable account connections.
                </p>
              </div>
            </div>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card id="connect-amazon-account" className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Connect Amazon Account</CardTitle>
              <CardDescription className="mt-1">
                Securely authorize access to your Amazon Seller Central data via OAuth 2.0
              </CardDescription>
            </div>
          </div>
          {oauthStatus?.oauthEnabled && (
            <Badge variant="success" className="px-3 py-1">
              <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Configured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {error && (
          <Alert variant="danger" className="border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 flex-shrink-0"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </Alert>
        )}

        {/* Marketplace Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Marketplace
          </label>
          <div className="relative">
            <select
              value={selectedMarketplace}
              onChange={(e) => setSelectedMarketplace(e.target.value)}
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={isAuthorizing}
            >
              {marketplaceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.flag} {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 002 2h2.945M15 11a3 3 0 11-6 0m6 0a3 3 0 10-6 0m6 0h1.055M21 11a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">How it works</h4>
              <ol className="space-y-2.5">
                {[
                  'Click "Connect Amazon Account" to start the authorization process',
                  'You\'ll be securely redirected to Amazon Seller Central',
                  'Log in with your Amazon seller credentials',
                  'Review and authorize the requested permissions',
                  'You\'ll be redirected back to complete the connection',
                ].map((step, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-sm text-blue-800">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-900 font-semibold text-xs flex items-center justify-center mt-0.5">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-green-900 mb-2">Secure Authorization</h4>
              <p className="text-sm text-green-800 leading-relaxed">
                We use industry-standard OAuth 2.0 for secure authorization. Your Amazon login credentials are{' '}
                <strong className="font-semibold">never shared with us</strong>. You maintain full control and can revoke
                access at any time directly from your Amazon Seller Central account settings.
              </p>
            </div>
          </div>
        </div>

        {/* Connect Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={handleConnect}
            disabled={isAuthorizing || isLoadingUrl || !redirectUri}
            className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
          >
            {isAuthorizing || isLoadingUrl ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Redirecting to Amazon...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Connect Amazon Account
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
