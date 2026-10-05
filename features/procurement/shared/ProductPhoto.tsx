'use client'

import React, { useEffect, useState } from 'react'
import { store } from '@/store/store'
import { cn } from '@/utils/cn'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

/** Photos need the user's token, so they are fetched and shown from a blob URL instead of a plain <img src>. */
function useProductPhotoUrl(productId: number | null, version: string): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (productId === null) {
      setUrl(null)
      return
    }
    let objectUrl: string | null = null
    let cancelled = false
    const token = store.getState().auth?.accessToken
    fetch(`${API_BASE_URL}/procurement/products/${productId}/photo`, { headers: token ? { authorization: `Bearer ${token}` } : undefined, credentials: 'include' })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (cancelled || !blob) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => !cancelled && setUrl(null))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [productId, version])
  return url
}

const Placeholder: React.FC = () => (
  <svg className="h-4 w-4 text-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

interface ProductPhotoProps {
  productId: number
  hasPhoto: boolean
  /** Changes when the photo may have changed (the product's updatedAt), so the thumbnail refetches. */
  version: string
  alt: string
  className?: string
}

export const ProductPhoto: React.FC<ProductPhotoProps> = ({ productId, hasPhoto, version, alt, className }) => {
  const url = useProductPhotoUrl(hasPhoto ? productId : null, version)
  return (
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary-50', className)}>
      {url ? <img src={url} alt={alt} className="h-full w-full object-cover" /> : <Placeholder />}
    </span>
  )
}
