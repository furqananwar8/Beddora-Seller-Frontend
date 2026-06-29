'use client'

import React from 'react'

export interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-800/50 flex items-center justify-center text-warning-400 border border-primary-700">
        <div className="w-5 h-5">
          {icon}
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-base font-bold mb-1 text-text-inverse">{title}</h3>
        <p className="text-secondary-200 leading-relaxed text-sm">{description}</p>
      </div>
    </div>
  )
}

