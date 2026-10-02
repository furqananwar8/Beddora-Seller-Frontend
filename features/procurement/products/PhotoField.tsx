'use client'

import React, { useEffect, useRef, useState } from 'react'
import { FileDropzone } from '@/components/file-dropzone/FileDropzone'
import { ProductPhoto } from '../shared/ProductPhoto'

const IMAGE_TYPES = ['image/jpeg', 'image/png']

interface PhotoFieldProps {
  /** Saved product whose current photo to show; absent for a row that is not saved yet. */
  productId?: number
  version?: string
  hasSavedPhoto: boolean
  /** The saved photo is marked for removal on save. */
  removing: boolean
  onRemoveSaved: (removing: boolean) => void
  file: File | null
  onFileChange: (file: File | null) => void
  compact?: boolean
  disabled?: boolean
}

/** Local preview of a picked, not yet uploaded photo. */
function usePreview(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) return setUrl(null)
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])
  return url
}

/** Photo (optional): the saved one, a newly picked one, or a picker. Uploads happen after the product saves. */
export const PhotoField: React.FC<PhotoFieldProps> = ({ productId, version = '', hasSavedPhoto, removing, onRemoveSaved, file, onFileChange, compact, disabled }) => {
  const preview = usePreview(file)
  const input = useRef<HTMLInputElement>(null)
  const showSaved = hasSavedPhoto && !removing && !file && productId !== undefined

  if (preview || showSaved) {
    return (
      <div className="flex items-center gap-3">
        {preview ? (
          <span className="flex h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border">
            <img src={preview} alt="New photo" className="h-full w-full object-cover" />
          </span>
        ) : (
          <ProductPhoto productId={productId!} hasPhoto version={version} alt="Product photo" className="h-12 w-12" />
        )}
        <div className="min-w-0 text-xs">
          <p className="truncate text-text-secondary">{file ? file.name : 'Current photo'}</p>
          {!disabled && (
            <button
              type="button"
              className="font-medium text-danger-600 hover:underline"
              onClick={() => (file ? onFileChange(null) : onRemoveSaved(true))}
            >
              {file ? 'Discard' : 'Remove'}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="text-xs">
        <input
          ref={input}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          className="hidden"
          onChange={(event) => {
            const picked = event.target.files?.[0] ?? null
            event.target.value = ''
            if (picked && IMAGE_TYPES.includes(picked.type) && picked.size <= 10 * 1024 * 1024) onFileChange(picked)
          }}
        />
        <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="ds-button ds-button-outline ds-button-sm">
          Upload photo
        </button>
        {removing && (
          <button type="button" className="ml-2 font-medium text-primary-600 hover:underline" onClick={() => onRemoveSaved(false)}>
            Undo remove
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <FileDropzone files={[]} onChange={(files) => onFileChange(files[0] ?? null)} accept={IMAGE_TYPES} title="Drop an image or browse" hint="JPG or PNG, up to 10 MB" disabled={disabled} />
      {removing && (
        <button type="button" className="mt-1 text-xs font-medium text-primary-600 hover:underline" onClick={() => onRemoveSaved(false)}>
          Undo remove
        </button>
      )}
    </div>
  )
}
