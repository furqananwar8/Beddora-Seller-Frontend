'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Tabs } from '@/design-system/tabs'
import { useGetEmailAccessQuery } from '@/services/api/systemEmail.api'
import { JobsTab } from './JobsTab'
import { RedisTab } from './RedisTab'

type MonitorTab = 'jobs' | 'redis'

/**
 * System > Jobs & Redis: the background jobs and the fast short-term memory behind the app, in plain words, live.
 * Same few accounts as System > Email (the access check is shared), so the menu item and the API agree.
 */
export const MonitorScreen: React.FC = () => {
  const { data: access, isLoading } = useGetEmailAccessQuery()
  const [tab, setTab] = useState<MonitorTab>('jobs')

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 px-1 sm:mb-6">
        <h1 className="flex items-center gap-3 text-xl font-bold text-text-primary sm:text-2xl">
          Jobs &amp; Redis
          {access?.allowed && <span className="rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700">● LIVE</span>}
        </h1>
        <p className="mt-1 text-sm text-text-muted">What the app is doing in the background, and what it is remembering right now. Updates by itself.</p>
      </div>
      {isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : access?.allowed ? (
        <>
          <div className="mb-4 max-w-full overflow-x-auto">
            <Tabs items={[{ id: 'jobs', label: 'Jobs' }, { id: 'redis', label: 'Redis' }]} activeTab={tab} onChange={(id) => setTab(id as MonitorTab)} />
          </div>
          {tab === 'jobs' ? <JobsTab /> : <RedisTab />}
        </>
      ) : (
        <EmptyState title="You do not have access to this screen" description="Ask an admin if you need to see the background jobs and Redis." />
      )}
    </Container>
  )
}
