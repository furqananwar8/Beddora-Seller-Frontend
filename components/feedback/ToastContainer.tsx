'use client'

import React from 'react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { removeNotification } from '@/store/ui.slice'
import { Toast } from './Toast'

/**
 * ToastContainer component - Feedback component
 * Container for displaying toasts
 */

export const ToastContainer: React.FC = () => {
  const notifications = useAppSelector((state) => state.ui.notifications)
  const dispatch = useAppDispatch()

  const handleClose = (id: string) => {
    dispatch(removeNotification(id))
  }

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          id={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={handleClose}
        />
      ))}
    </div>
  )
}

