"use client"

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ProductInventoryItem } from '@/services/api/inventoryPlanner.api'
import { useScrollLock } from '@/hooks/useScrollLock'
import { cn } from '@/utils/cn'
import { AllocationStep, AllocationDrawerModel, useAllocationDrawer } from './useAllocationDrawer'
import { SplitStep } from './SplitStep'
import { ChannelsStep } from './ChannelsStep'
import { ReviewStep } from './ReviewStep'
import { ResultStep } from './ResultStep'
import { DrawerButton } from './drawerUi'

interface AllocationDrawerProps {
  /** Snapshot of the selected planner rows, taken when the drawer opens. */
  items: ProductInventoryItem[]
  onClose: () => void
  /** Opens FBA shipment creation for the drawer's items. */
  onCreateShipment: (itemIds: string[]) => void
}

type WizardStep = Exclude<AllocationStep, 'result'>

const WIZARD_STEPS: { step: WizardStep; label: string }[] = [
  { step: 'split', label: 'Split stock' },
  { step: 'channels', label: 'Channels' },
  { step: 'review', label: 'Review and save' },
]

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5L20 7" />
  </svg>
)

const Stepper = ({ current, onGo }: { current: WizardStep; onGo: (step: WizardStep) => void }) => {
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.step === current)
  return (
    <ol className="flex items-center gap-2">
      {WIZARD_STEPS.map(({ step, label }, index) => {
        const done = index < currentIndex
        const active = index === currentIndex
        return (
          <li key={step} className="flex items-center gap-2">
            {index > 0 && <span className="w-6 h-px bg-slate-300" aria-hidden="true" />}
            <button
              type="button"
              disabled={!done}
              onClick={() => onGo(step)}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 h-9 px-3.5 !rounded-lg text-sm font-medium disabled:cursor-default',
                active
                  ? 'bg-primary-600 text-text-inverse'
                  : done
                  ? 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  : 'bg-slate-100 text-slate-500'
              )}
            >
              <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-semibold leading-none tabular-nums">
                {done ? <CheckIcon /> : index + 1}
              </span>
              {label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** Title, subtitle and footer for each step, so the shell has no per-step branching. */
function stepCopy(model: AllocationDrawerModel, items: ProductInventoryItem[]) {
  const { state, errors, listingCount, targets } = model
  const attention = Object.keys(errors).length
  const connected = targets.filter((t) => t.connected).length
  const moves = state.result?.items.reduce((sum, i) => sum + i.moves.length, 0) ?? 0

  return {
    split: {
      title: 'Allocate stock',
      subtitle: `${plural(items.length, 'product')} · each new sheet entry adds stock to assign`,
      hint: attention > 0 ? `${plural(attention, 'product')} need${attention === 1 ? 's' : ''} attention before you continue` : 'Step 1 of 3',
    },
    channels: {
      title: 'Allocate stock',
      subtitle: 'Choose where each SKU’s FBM quantity goes. Existing listings are updated, missing ones are created.',
      hint: `${listingCount} of ${connected * items.length} selected across ${plural(items.length, 'product')}`,
    },
    review: {
      title: 'Allocate stock',
      subtitle: 'Nothing is saved or pushed until you confirm. Every change below is saved together or not at all.',
      hint: 'If stock changed since you opened this, we’ll ask you to reload before saving',
    },
    result: {
      title: 'Stock split saved',
      subtitle: `${plural(moves, 'movement')} recorded. ${
        state.result?.pushResults.length ? 'Channel updates are done, so you can close this.' : 'Nothing was pushed to channels.'
      }`,
      hint: '',
    },
  }[state.step]
}

function FooterActions({ model, items, onClose, onCreateShipment }: { model: AllocationDrawerModel } & AllocationDrawerProps) {
  const { state, goTo, save, isSaving, hasErrors, listingCount, preview } = model
  const reviewBlocked = (preview.data?.conflicts.length ?? 0) > 0

  switch (state.step) {
    case 'split':
      return (
        <>
          <DrawerButton onClick={onClose}>Cancel</DrawerButton>
          <DrawerButton variant="primary" onClick={() => goTo('channels')} disabled={hasErrors}>
            Continue to channels
          </DrawerButton>
        </>
      )
    case 'channels':
      return (
        <>
          <DrawerButton onClick={() => goTo('split')}>Back</DrawerButton>
          <DrawerButton variant="primary" onClick={() => goTo('review')}>
            Review changes
          </DrawerButton>
        </>
      )
    case 'review':
      return (
        <>
          <DrawerButton onClick={() => goTo('channels')} disabled={isSaving}>
            Back
          </DrawerButton>
          <DrawerButton variant="primary" onClick={save} isLoading={isSaving} disabled={reviewBlocked || preview.isFetching}>
            {listingCount > 0 ? `Save and push ${plural(listingCount, 'listing')}` : 'Save'}
          </DrawerButton>
        </>
      )
    case 'result':
      return (
        <>
          <DrawerButton onClick={() => onCreateShipment(items.map((i) => i.id))}>Create FBA shipment</DrawerButton>
          <DrawerButton variant="primary" onClick={onClose}>
            Done
          </DrawerButton>
        </>
      )
  }
}

export const AllocationDrawer: React.FC<AllocationDrawerProps> = (props) => {
  const { items, onClose } = props
  const model = useAllocationDrawer(items)
  const { state, isSaving } = model
  const close = () => !isSaving && onClose()
  const copy = stepCopy(model, items)

  useScrollLock()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const body: Record<AllocationStep, React.ReactNode> = {
    split: <SplitStep items={items} model={model} />,
    channels: <ChannelsStep items={items} model={model} />,
    review: <ReviewStep items={items} model={model} />,
    result: <ResultStep items={items} model={model} />,
  }

  // Portal to <body> so scrolling over the drawer or backdrop never reaches the page's own scroll area
  return createPortal(
    <div className="fixed inset-0 z-50 overscroll-none" role="dialog" aria-modal="true" aria-labelledby="allocation-drawer-title">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <div className="absolute inset-y-0 right-0 w-full max-w-[1120px] bg-white border-l border-slate-200 shadow-2xl flex flex-col">
        <header className="px-8 pt-6 pb-5 border-b border-slate-200 bg-slate-50 flex flex-col gap-[18px]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="allocation-drawer-title" className="text-[22px] font-semibold text-slate-900">
                {copy.title}
              </h2>
              <p className="text-sm text-slate-600">{copy.subtitle}</p>
            </div>
            <DrawerButton aria-label="Close drawer" onClick={close} className="w-11 px-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </DrawerButton>
          </div>
          {state.step !== 'result' && <Stepper current={state.step} onGo={model.goTo} />}
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-8 py-6">{body[state.step]}</div>

        <footer className="px-8 py-[18px] border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <span className="text-sm text-slate-600">{copy.hint}</span>
          <div className="flex items-center gap-3">
            <FooterActions model={model} {...props} onClose={close} />
          </div>
        </footer>
      </div>
    </div>,
    document.body
  )
}
