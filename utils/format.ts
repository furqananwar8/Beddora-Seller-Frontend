import { format as dateFnsFormat } from 'date-fns'

/**
 * Format utility functions
 * 
 * Common formatting functions for dates, currency, numbers, etc.
 */

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export const formatNumber = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(dateObj)
}

export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${formatNumber(value, decimals)}%`
}


/**
 * A calendar day (invoice date, ETD) as `dd MMM yyyy`. Such dates arrive as midnight UTC, so they are
 * read in UTC; local-time formatting would show the previous day west of Greenwich.
 */
export function formatCalendarDay(value: string | Date, pattern = 'dd MMM yyyy'): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return dateFnsFormat(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()), pattern)
}
