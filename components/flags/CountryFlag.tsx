import React from 'react'
import { cn } from '@/utils/cn'

export type FlagCode = 'CA' | 'US' | 'MX'

/** Emoji flags show as letters on Windows, so the few countries we sell in are drawn here (3:2, simplified). */
const FLAGS: Record<FlagCode, React.ReactNode> = {
  CA: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect width="7.5" height="20" fill="#d52b1e" />
      <rect x="22.5" width="7.5" height="20" fill="#d52b1e" />
      <path d="M15 4l1.2 2.4 1.6-.6-.5 3.4 2.1-1.9.5 1.4 1.9-.3-.8 2.1.9.5-3.5 2.6.4 1.2-3.3-.5V18h-1v-3.7l-3.3.5.4-1.2-3.5-2.6.9-.5-.8-2.1 1.9.3.5-1.4 2.1 1.9-.5-3.4 1.6.6z" fill="#d52b1e" />
    </>
  ),
  US: (
    <>
      <rect width="30" height="20" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((stripe) => (
        <rect key={stripe} y={(stripe * 20) / 13} width="30" height={20 / 13} fill="#b22234" />
      ))}
      <rect width="12" height={(7 * 20) / 13} fill="#3c3b6e" />
    </>
  ),
  MX: (
    <>
      <rect width="10" height="20" fill="#006847" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#ce1126" />
      <circle cx="15" cy="10" r="2.5" fill="#8c6239" />
    </>
  ),
}

export const CountryFlag: React.FC<{ code: FlagCode; className?: string; title?: string }> = ({ code, className, title }) => (
  <svg viewBox="0 0 30 20" role="img" aria-label={title ?? code} className={cn('inline-block h-3 w-[1.125rem] shrink-0 rounded-[2px] ring-1 ring-black/10', className)}>
    {FLAGS[code]}
  </svg>
)
