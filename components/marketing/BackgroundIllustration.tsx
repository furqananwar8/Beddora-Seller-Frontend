'use client'

import React from 'react'

/**
 * Background illustration for promotional section
 * Shows abstract charts/graphs representing profit tracking
 */
export const BackgroundIllustration: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-800/50 via-primary-900/80 to-primary-950"></div>
      
      {/* Abstract chart illustration */}
      <svg 
        className="absolute bottom-0 right-0 w-2/3 h-2/3 opacity-5" 
        viewBox="0 0 600 600" 
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Profit trend line - upward curve */}
        <path
          d="M 100 500 Q 200 400, 300 300 T 500 150"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-warning-400"
          strokeLinecap="round"
        />
        
        {/* Secondary trend line */}
        <path
          d="M 50 550 Q 150 450, 250 380 T 450 280"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          className="text-success-400"
          strokeLinecap="round"
          opacity="0.7"
        />
        
        {/* Bar chart bars - growing upward */}
        <rect x="120" y="480" width="35" height="100" className="fill-warning-400" opacity="0.3" rx="4" />
        <rect x="180" y="440" width="35" height="140" className="fill-warning-400" opacity="0.3" rx="4" />
        <rect x="240" y="390" width="35" height="190" className="fill-warning-400" opacity="0.3" rx="4" />
        <rect x="300" y="340" width="35" height="240" className="fill-warning-400" opacity="0.3" rx="4" />
        <rect x="360" y="280" width="35" height="300" className="fill-warning-400" opacity="0.3" rx="4" />
        <rect x="420" y="220" width="35" height="360" className="fill-warning-400" opacity="0.3" rx="4" />
        
        {/* Circular progress indicators */}
        <circle cx="480" cy="120" r="50" stroke="currentColor" strokeWidth="3" fill="none" className="text-warning-400" opacity="0.3" />
        <circle cx="480" cy="120" r="35" stroke="currentColor" strokeWidth="2" fill="none" className="text-success-400" opacity="0.2" />
        
        {/* Data points */}
        <circle cx="300" cy="300" r="6" className="fill-warning-400" opacity="0.4" />
        <circle cx="400" cy="200" r="6" className="fill-warning-400" opacity="0.4" />
        <circle cx="500" cy="150" r="6" className="fill-warning-400" opacity="0.4" />
      </svg>
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Radial gradient for depth */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-warning-400/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-success-400/5 rounded-full blur-3xl"></div>
    </div>
  )
}

