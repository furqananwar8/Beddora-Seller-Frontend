'use client'

import React from 'react'
import { cn } from '@/utils/cn'

/**
 * Container component - Layout component
 * Provides consistent max-width and padding
 */

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export const Container: React.FC<ContainerProps> = ({
  size = 'lg',
  className,
  children,
  ...props
}) => {
  const sizes = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  }

  return (
    <div
      className={cn('mx-auto px-4 sm:px-6 lg:px-8', sizes[size], className)}
      {...props}
    >
      {children}
    </div>
  )
}

