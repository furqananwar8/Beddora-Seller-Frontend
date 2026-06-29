'use client'

import React from 'react'
import { cn } from '@/utils/cn'

/**
 * Button component - Pure UI component, no business logic
 * 
 * Usage:
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  children,
  ...props
}) => {
  const baseStyles = 'ds-button'
  
  const variants = {
    primary: 'ds-button-primary',
    secondary: 'ds-button-secondary',
    outline: 'ds-button-outline',
    ghost: 'ds-button-ghost',
    danger: 'ds-button-danger',
  }
  
  const sizes = {
    sm: 'ds-button-sm',
    md: 'ds-button-md',
    lg: 'ds-button-lg',
  }

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  )
}

