'use client'

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  /**
   * A title area that stays put while the body scrolls, with the close button beside it. Without it the whole modal scrolls
   * (the close button too).
   */
  header?: React.ReactNode
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  /** Close when the dimmed area outside the modal is clicked. Off by default: the close button is the way out. */
  closeOnBackdropClick?: boolean
  /** Close when Escape is pressed. Off by default for the same reason. */
  closeOnEscape?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  header,
  children,
  size = 'md',
  className,
  closeOnBackdropClick = false,
  closeOnEscape = false,
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
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  
  // Rendered on the body: inside a row or a panel, its z-index would only count within that parent's stacking context
  // and a later sibling could paint over the backdrop. React events still bubble through the tree it was declared in.
  return createPortal(
    <div className="ds-modal-wrap" onClick={closeOnBackdropClick ? onClose : undefined} style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div className="ds-modal-backdrop" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} />
      
      {/* Modal */}
      <div
        className={cn(
          'ds-modal',
          sizes[size],
          header && 'flex flex-col overflow-hidden',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        // A form inside the modal must not also submit a form the modal is rendered within (e.g. "+ Add bank" opened from the payment form)
        onSubmit={(e) => e.stopPropagation()}
        style={{ zIndex: 10000 }}
      >
        {title && (
          <div className="ds-modal-header">
            <h2 className="text-section-title">{title}</h2>
          </div>
        )}
        {header && <div className="shrink-0 px-6 pt-4">{header}</div>}
        <div className={cn('ds-modal-content', header && 'min-h-0 flex-1 overflow-y-auto pt-0')}>{children}</div>
        <button
          type="button"
          onClick={onClose}
          className="ds-modal-close"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  )
}

