'use client'

import Link from 'next/link'
import React from 'react'

interface TermsCheckboxProps {
  checked: boolean
  onChange: (value: boolean) => void
  label: 'terms' | 'privacy'
}

const copy = {
  terms: {
    text: 'I accept the Terms & Conditions',
    href: '/terms',
  },
  privacy: {
    text: 'I accept the Privacy Policy',
    href: '/privacy',
  },
}

export const TermsCheckbox: React.FC<TermsCheckboxProps> = ({ checked, onChange, label }) => {
  const item = copy[label]
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
        required
      />
      <span className="text-sm">
        {item.text}{' '}
        <Link href={item.href} className="text-primary-600 hover:underline" target="_blank">
          View
        </Link>
      </span>
    </label>
  )
}
