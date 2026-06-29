'use client'

import React, { useEffect } from 'react'
import { cn } from '@/utils/cn'

/**
 * Modal component - Pure UI component
 * 
 * Usage:
 * <Modal isOpen={isOpen} onClose={handleClose} title="Modal Title">
 *   <p>Modal content here</p>
 * </Modal>
 */

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  console.log('Modal rendering with isOpen=true')
  
  return (
    <div className="ds-modal-wrap" onClick={onClose} style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div className="ds-modal-backdrop" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} />
      
      {/* Modal */}
      <div
        className={cn(
          'ds-modal',
          sizes[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10000 }}
      >
        {title && (
          <div className="ds-modal-header">
            <h2 className="text-section-title">{title}</h2>
          </div>
        )}
        <div className="ds-modal-content">{children}</div>
        <button
          onClick={onClose}
          className="ds-modal-close"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

