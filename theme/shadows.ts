/**
 * Shadow theme tokens
 * Box shadows for elevation and depth
 */

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(15 23 42 / 0.06)',
  DEFAULT: '0 1px 3px 0 rgb(15 23 42 / 0.08), 0 1px 2px -1px rgb(15 23 42 / 0.06)',
  md: '0 4px 8px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.06)',
  lg: '0 12px 20px -6px rgb(15 23 42 / 0.12), 0 6px 8px -6px rgb(15 23 42 / 0.08)',
  xl: '0 20px 30px -12px rgb(15 23 42 / 0.16)',
  '2xl': '0 30px 50px -12px rgb(15 23 42 / 0.2)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  card: '0 1px 2px 0 rgb(15 23 42 / 0.06)',
} as const

export type ShadowSize = keyof typeof shadows

