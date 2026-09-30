import React from 'react'
import { cn } from '@/utils/cn'

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  value: number
  onValueChange: (value: number) => void
}

/** Native range input with the design-system accent; the value is reported as a number. */
export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ value, onValueChange, min = 0, max = 100, step = 1, className, ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className={cn('w-full h-2 cursor-pointer accent-primary-600 disabled:cursor-not-allowed disabled:opacity-40', className)}
      {...props}
    />
  )
)
Slider.displayName = 'Slider'
