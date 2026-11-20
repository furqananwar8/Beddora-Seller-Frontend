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

/**
 * Settings > Approvals, laid out like the approved design: a header bar (title on the left, the tab's own actions on the
 * right), underlined tabs, then the list on the left and the editor on the right.
 */
export const ApprovalsScreen: React.FC = () => {
  const [tab, setTab] = useState<TabId>('rules')
  // The tabs put their Save / Discard / "+ New department" buttons into the header bar through this element
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  return (
    <div className="overflow-hidden rounded-[10px] border border-slate-300 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-3 py-2">
        <b className="text-[13px] text-slate-900">Approvals</b>
        <span ref={setSlot} className="flex items-center gap-2" />
      </div>
      <div className="flex border-b border-slate-200 bg-white px-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn('-mb-px border-b-2 px-3 py-1.5 text-[13px] font-semibold', tab === item.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700')}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'rules' && <RulesTab slot={slot} />}
      {tab === 'departments' && <DepartmentsTab slot={slot} />}
      {tab === 'notifications' && <NotificationsTab slot={slot} />}
    </div>
  )
}
