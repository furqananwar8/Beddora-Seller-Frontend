'use client'

import React from 'react'

export interface LogoProps {
  variant?: 'light' | 'dark'
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
}

export const Logo: React.FC<LogoProps> = ({ variant = 'dark', showText = true, size = 'md' }) => {
  const iconColor = variant === 'light' ? 'text-primary-900' : 'text-text-inverse'
  const bgColor = variant === 'light' ? 'bg-primary-900' : 'bg-text-inverse'
  const textColor = variant === 'light' ? 'text-text-primary' : 'text-text-inverse'

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeClasses[size]} ${bgColor} rounded-lg flex items-center justify-center`}>
        <svg className={`${sizeClasses[size === 'sm' ? 'sm' : 'md']} ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
      {showText && <span className={`text-xl font-semibold ${textColor}`}>Beddora</span>}
    </div>
  )
}

