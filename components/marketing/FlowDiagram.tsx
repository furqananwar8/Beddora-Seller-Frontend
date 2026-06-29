'use client'

import React from 'react'

export interface FlowStep {
  icon: React.ReactNode
  title: string
  description: string
}

export interface FlowDiagramProps {
  steps: FlowStep[]
}

/**
 * Flow diagram component showing how Beddora supports users
 * Displays a horizontal flow with connecting arrows
 */
export const FlowDiagram: React.FC<FlowDiagramProps> = ({ steps }) => {
  return (
    <div className="hidden lg:flex lg:w-1/3 bg-gradient-to-b from-primary-900/40 via-primary-900/30 to-primary-950/40 border-x border-primary-800/30 items-center justify-center p-6 relative overflow-hidden h-screen">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div 
          className="w-full h-full" 
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 1) 1px, transparent 1px)
            `,
            backgroundSize: '25px 25px'
          }}
        />
      </div>

      {/* Flow Steps */}
      <div className="relative z-10 w-full px-4">
        <div className="flex flex-col items-center justify-center space-y-8">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              {/* Step */}
              <div className="flex flex-col items-center w-full">
                <div className="w-14 h-14 rounded-full bg-primary-800/70 border-2 border-warning-400/40 flex items-center justify-center text-warning-400 mb-3 shadow-lg backdrop-blur-sm">
                  <div className="w-7 h-7">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-base font-bold text-text-inverse mb-1.5 text-center">
                  {step.title}
                </h3>
                <p className="text-xs text-secondary-300 text-center leading-relaxed max-w-[160px]">
                  {step.description}
                </p>
              </div>

              {/* Arrow connector (except for last step) */}
              {index < steps.length - 1 && (
                <div className="flex items-center justify-center flex-shrink-0 -my-2">
                  <svg 
                    className="w-6 h-6 text-warning-400/50" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2.5} 
                      d="M19 9l-7 7-7-7" 
                    />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

