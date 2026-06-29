'use client'

import React from 'react'
import { cn } from '@/utils/cn'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  className,
  children,
  ...props
}) => {
  const variants = {
    info: 'bg-primary-50 text-primary-700 border-primary-100',
    success: 'bg-success-50 text-success-700 border-success-100',
    warning: 'bg-warning-50 text-warning-700 border-warning-100',
    danger: 'bg-danger-50 text-danger-700 border-danger-100',
  }

  return (
    <div
      className={cn('rounded-lg border px-4 py-3 text-sm', variants[variant], className)}
      role="alert"
      {...props}
    >
      {title && <div className="font-semibold mb-1">{title}</div>}
      <div className="text-sm">{children}</div>
    </div>
  )
}

