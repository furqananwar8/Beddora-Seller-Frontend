import React from 'react'
import { fieldClass } from '../shared/FormField'
import { COUNTRIES } from './countries'

interface CountrySelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  error?: string
}

/** Native select of the curated country list: keyboard type-ahead works on every device. */
export const CountrySelect = React.forwardRef<HTMLSelectElement, CountrySelectProps>(({ error, className, ...props }, ref) => (
  <select ref={ref} className={`${fieldClass(error)} ${className ?? ''}`} {...props}>
    <option value="">Select country</option>
    {COUNTRIES.map((country) => (
      <option key={country.code} value={country.code}>
        {country.name} ({country.code})
      </option>
    ))}
  </select>
))
CountrySelect.displayName = 'CountrySelect'
