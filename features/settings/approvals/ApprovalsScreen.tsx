'use client'

import React, { useState } from 'react'
import { cn } from '@/utils/cn'
import { DepartmentsTab } from './DepartmentsTab'
import { NotificationsTab } from './NotificationsTab'
import { RulesTab } from './RulesTab'

const TABS = [
  { id: 'rules', label: 'Approval rules' },
  { id: 'departments', label: 'Departments' },
  { id: 'notifications', label: 'Notifications' },
] as const

type TabId = (typeof TABS)[number]['id']

/** The two bars of the card a tab can put things into. */
export interface Slots {
  header: HTMLElement | null
  footer: HTMLElement | null
}

/**
 * Settings > Approvals: a header bar, underlined tabs, a body of fixed height (each pane scrolls inside it, so switching
 * tabs never resizes the card) and a footer bar with the tab's status, Discard and Save.
 */
export const ApprovalsScreen: React.FC = () => {
  const [tab, setTab] = useState<TabId>('rules')
  const [header, setHeader] = useState<HTMLElement | null>(null)
  const [footer, setFooter] = useState<HTMLElement | null>(null)
  const slots: Slots = { header, footer }

  return (
    <div className="overflow-hidden rounded-[10px] border border-slate-300 bg-white">
      <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-slate-100 px-4">
        <b className="text-base text-slate-900">Approvals</b>
        <span ref={setHeader} className="flex items-center gap-2" />
      </div>
      <div className="flex border-b border-slate-200 bg-white px-4">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn('-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold', tab === item.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700')}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ height: 'clamp(480px, calc(100vh - 380px), 760px)' }}>
        {tab === 'rules' && <RulesTab slots={slots} />}
        {tab === 'departments' && <DepartmentsTab slots={slots} />}
        {tab === 'notifications' && <NotificationsTab slots={slots} />}
      </div>
      <div ref={setFooter} className="flex h-16 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4" />
    </div>
  )
}
