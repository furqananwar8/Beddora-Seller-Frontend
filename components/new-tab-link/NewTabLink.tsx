import React from 'react'
import { cn } from '@/utils/cn'

interface NewTabLinkProps {
  href: string
  title?: string
  className?: string
  children: React.ReactNode
}

/**
 * A link that always opens in a new browser tab and leaves the current page (and any open modal or row click handler) as it is.
 * It is a plain anchor, so it also works with middle click and "copy link".
 */
export const NewTabLink: React.FC<NewTabLinkProps> = ({ href, title = 'Opens in a new tab', className, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    title={title}
    className={cn('text-primary-600 underline-offset-2 hover:underline', className)}
    onClick={(event) => {
      event.stopPropagation()
      if (window.open(href, '_blank', 'noopener,noreferrer')) event.preventDefault()
    }}
  >
    {children}
  </a>
)
