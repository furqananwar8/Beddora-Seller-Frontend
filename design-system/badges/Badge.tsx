'use client'

import React from 'react'
import { cn } from '@/utils/cn'

/**
 * Badge component - Pure UI component
 * 
 * Usage:
 * <Badge variant="success">Active</Badge>
 * <Badge variant="error">Inactive</Badge>
 */

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const baseStyles = 'ds-badge'
  
  const variants = {
    primary: 'ds-badge-primary',
    secondary: 'ds-badge-secondary',
    success: 'ds-badge-success',
    warning: 'ds-badge-warning',
    error: 'ds-badge-error',
  }
  
  const sizes = {
    sm: 'ds-badge-sm',
    md: 'ds-badge-md',
    lg: 'ds-badge-lg',
  }

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  )
}

