'use client'

import React from 'react'
import { Input, InputProps } from '@/design-system/inputs'
import { cn } from '@/utils/cn'

export interface InputWithIconProps extends InputProps {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onRightIconClick?: () => void
}

export const InputWithIcon: React.FC<InputWithIconProps> = ({
  leftIcon,
  rightIcon,
  onRightIconClick,
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {props.label && (
        <label htmlFor={props.id} className="ds-input-label">
          {props.label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-text-muted">{leftIcon}</div>
          </div>
        )}
        <input
          {...props}
          className={cn(
            'ds-input',
            props.error ? 'ds-input-error' : 'ds-input-default',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
        />
        {rightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors"
          >
            {rightIcon}
          </button>
        )}
      </div>
      {props.error && <p className="ds-input-error-text">{props.error}</p>}
      {props.helperText && !props.error && <p className="ds-input-helper">{props.helperText}</p>}
    </div>
  )
}

