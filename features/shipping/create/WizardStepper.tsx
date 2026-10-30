import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface StepDef {
  title: string
  /** Under the title until the step is finished. */
  hint: string
}

const ADDRESS: StepDef = { title: 'Address Info', hint: 'From & to' }
const SHIPMENT: StepDef = { title: 'Shipment Info', hint: 'Product, carton, customs' }
const RATES: StepDef = { title: 'Rates', hint: 'Compare & select' }
const BOOKING: StepDef = { title: 'Booking', hint: 'Review & book' }

/** Create shipment from scratch. */
export const CREATE_STEPS = [ADDRESS, SHIPMENT, RATES, BOOKING]
/** Booking a channel order: address and parcel come from the order. */
export const ORDER_STEPS = [RATES, BOOKING]

interface WizardStepperProps {
  steps: StepDef[]
  /** Index into `steps`. */
  current: number
  /** Under each finished step: what was chosen there ("Mississauga → Buffalo, NY"). */
  summaries: Array<string | null>
  /** Finished steps can be clicked to go back to them. */
  onGoTo: (index: number) => void
}

/** A wizard's steps, with what each finished step settled. */
export const WizardStepper: React.FC<WizardStepperProps> = ({ steps, current, summaries, onGoTo }) => (
  <ol className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
    {steps.map(({ title, hint }, step) => {
      const done = step < current
      return (
        <li key={title} className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            disabled={!done}
            onClick={() => onGoTo(step)}
            aria-current={step === current ? 'step' : undefined}
            className="flex min-w-0 items-center gap-2 text-left disabled:cursor-default"
          >
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                done ? 'bg-success-600 text-white' : step === current ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-text-muted'
              )}
            >
              {done ? <Check className="h-4 w-4" aria-hidden /> : step + 1}
            </span>
            <span className="min-w-0">
              <span className={cn('block text-sm font-medium', step === current ? 'text-text-primary' : 'text-text-muted')}>{title}</span>
              <span className="block truncate text-xs text-text-muted">{(done && summaries[step]) || hint}</span>
            </span>
          </button>
          {step < steps.length - 1 && <span className={cn('hidden h-px flex-1 sm:block', done ? 'bg-success-500' : 'bg-border')} />}
        </li>
      )
    })}
  </ol>
)
