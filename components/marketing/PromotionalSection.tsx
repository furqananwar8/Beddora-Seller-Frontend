'use client'

import React from 'react'
import { FeatureCard, FeatureCardProps } from './FeatureCard'
import { TestimonialCard, TestimonialCardProps } from './TestimonialCard'
import { BackgroundIllustration } from './BackgroundIllustration'
import { FlowStep } from './FlowDiagram'

export interface PromotionalSectionProps {
  logo: React.ReactNode
  heading: string
  subtitle: string
  features: FeatureCardProps[]
  testimonial: TestimonialCardProps
  flowSteps: FlowStep[]
}

export const PromotionalSection: React.FC<PromotionalSectionProps> = ({
  logo,
  heading,
  subtitle,
  features,
  testimonial,
  flowSteps,
}) => {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-primary-900 text-text-inverse flex-col justify-between relative overflow-hidden h-screen">
      {/* Background Illustration */}
      <BackgroundIllustration />
      
      {/* Content with optimized padding */}
      <div className="relative z-10 flex flex-col h-full p-8 xl:p-10 overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">{logo}</div>

          {/* Main Heading */}
          <div className="mb-6">
            <h1 className="text-3xl xl:text-4xl font-bold mb-3 leading-tight text-text-inverse">
              {heading}
            </h1>
            <p className="text-base xl:text-lg text-secondary-200 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-5 mb-6">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>

          {/* Flow Diagram - Compact Grid Layout */}
          <div className="mb-6 pt-6 border-t border-primary-800/50">
            <h2 className="text-lg font-bold text-text-inverse mb-4">How Beddora Works</h2>
            <div className="grid grid-cols-2 gap-4">
              {flowSteps.map((step, index) => (
                <div key={index} className="flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary-800/70 border-2 border-warning-400/40 flex items-center justify-center text-warning-400 flex-shrink-0">
                      <div className="w-5 h-5">
                        {step.icon}
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-text-inverse">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs text-secondary-300 leading-relaxed pl-13">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="mt-auto pt-4">
          <TestimonialCard {...testimonial} />
        </div>
      </div>
    </div>
  )
}

