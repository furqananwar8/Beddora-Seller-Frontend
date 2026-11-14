import Image from 'next/image'
import { cn } from '@/utils/cn'

interface BeddoraBrandProps {
  /** `dark` for dark backgrounds: the logo and its caption turn white. */
  tone?: 'light' | 'dark'
  size?: 'md' | 'lg' | 'xl'
  align?: 'start' | 'center'
  className?: string
}

const SIZES = {
  md: { logo: 'h-12', caption: 'text-xs' },
  lg: { logo: 'h-12', caption: 'mt-1 text-sm' },
  xl: { logo: 'h-20', caption: 'mt-2 text-lg' },
} as const

/** The Beddora logo (the same artwork the PDFs carry) with the product name under it. */
export function BeddoraBrand({ tone = 'light', size = 'md', align = 'start', className }: BeddoraBrandProps) {
  const s = SIZES[size]
  return (
    <div className={cn('flex flex-col leading-none', align === 'center' ? 'items-center' : 'items-start', className)}>
      <Image
        src="/beddora-logo.png"
        alt="Beddora"
        width={231}
        height={101}
        priority
        className={cn('w-auto', s.logo, tone === 'dark' && 'brightness-0 invert')}
      />
      <span className={cn('font-bold leading-none', s.caption, tone === 'dark' ? 'text-white/80' : 'text-text-secondary')}>
        Commerce
        {/* The logo's own purple; white with the logo on dark backgrounds */}
        <span className={tone === 'dark' ? 'text-white' : 'text-[#3D245E]'}>Core</span>
      </span>
    </div>
  )
}
