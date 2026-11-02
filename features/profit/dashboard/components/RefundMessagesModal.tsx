'use client'

import React from 'react'
import { format } from 'date-fns'
import { Modal } from '@/design-system/modals/Modal'
import type { RefundMessage } from '@/services/api/profit.api'

interface RefundMessagesModalProps {
  /** The product the messages are about; null keeps the modal closed. */
  title: string | null
  messages: RefundMessage[]
  onClose: () => void
}

const when = (iso: string | null) => (iso ? format(new Date(iso), 'MMM d, yyyy · HH:mm') : 'Date not reported')

/** Every customer message on a product's returns, newest first, each with when it came back, its reason and order. */
export const RefundMessagesModal: React.FC<RefundMessagesModalProps> = ({ title, messages, onClose }) => (
  <Modal isOpen={title !== null} onClose={onClose} title={`Return messages${title ? ` · ${title}` : ''}`} size="lg" closeOnEscape closeOnBackdropClick>
    {messages.length === 0 ? (
      <p className="py-6 text-center text-sm text-text-muted">No customer left a message on these returns.</p>
    ) : (
      <ol className="divide-y divide-border">
        {messages.map((message, index) => (
          <li key={`${message.orderId}-${message.returnedAt}-${index}`} className="py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-text-muted">
              <span className="font-medium text-text-primary">{when(message.returnedAt)}</span>
              <span>
                {message.reason}
                {message.status && ` · ${message.status}`}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-text-primary">“{message.comment}”</p>
            <p className="mt-1 text-xs text-text-muted">{[message.orderId && `Order ${message.orderId}`, message.sku].filter(Boolean).join(' · ')}</p>
          </li>
        ))}
      </ol>
    )}
  </Modal>
)
