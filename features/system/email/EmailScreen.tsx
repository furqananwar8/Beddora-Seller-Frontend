'use client'

import React, { useMemo, useState } from 'react'
import { subDays, format } from 'date-fns'
import { Container } from '@/components/layout'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { ListDateFilter } from '@/components/date-range-picker/ListDateFilter'
import type { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { EmptyState } from '@/components/data-display/EmptyState'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Button } from '@/design-system/buttons'
import { FormField } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { KpiCard } from '@/design-system/kpi'
import { Tabs } from '@/design-system/tabs'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import {
  useGetEmailAccessQuery,
  useGetEmailBacklogQuery,
  useGetEmailsQuery,
  useGetEmailSummaryQuery,
  useGetEmailTemplatesQuery,
  useResendEmailsMutation,
  type EmailListParams,
  type EmailRow,
  type EmailStatus,
  type EmailTab,
  type ResendBody,
  type ResendResult,
} from '@/services/api/systemEmail.api'
import { ANY_DATE } from '@/utils/dateRangeFilter'
import { BacklogPanel } from './BacklogPanel'
import { BulkLink, EmailBulkBar } from './EmailBulkBar'
import { EmailHistoryDialog } from './EmailHistoryDialog'
import { EmailTable } from './EmailTable'
import { useEmailLive } from './useEmailLive'
import { useSelection } from './useSelection'

import { usePageSize } from '@/hooks/usePageSize'
const PAGE_SIZE = 25
const BACKLOG_DEFAULT_DAYS = 90

type ScreenTab = EmailTab | 'BACKLOG'

/** What a resend did, in words: what went out, and why some did not. */
function resendMessage({ resent, skippedSent, skippedQueued, notFound }: ResendResult): string {
  const skipped = [skippedQueued && `${skippedQueued} already queued`, skippedSent && `${skippedSent} sent (not resent)`, notFound && `${notFound} not found`].filter(Boolean)
  return `${resent} email${resent === 1 ? '' : 's'} queued to resend${skipped.length ? `. Skipped: ${skipped.join(', ')}` : ''}`
}

/** Email: everything the system sent, is sending or failed to send, with a way to send again. Only a few accounts get here. */
export const EmailScreen: React.FC = () => {
  const { data: access, isLoading } = useGetEmailAccessQuery()

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 px-1 sm:mb-6">
        <h1 className="flex items-center gap-3 text-xl font-bold text-text-primary sm:text-2xl">
          Email
          {access?.allowed && <span className="rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700">● LIVE</span>}
        </h1>
        <p className="mt-1 text-sm text-text-muted">Emails the system sent, is sending, or failed to send. Open an email to see every time it was sent.</p>
      </div>
      {isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : access?.allowed ? (
        <EmailWorkspace />
      ) : (
        <EmptyState title="You do not have access to this screen" description="Ask an admin if you need to see the emails the system sends." />
      )}
    </Container>
  )
}

const EmailWorkspace: React.FC = () => {
  const { success, failure, info } = useApiFeedback()
  const [tab, setTab] = useState<ScreenTab>('ALL')
  const [page, setPage] = useState(1)
  const pageSize = usePageSize(PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [template, setTemplate] = useState('')
  const [range, setRange] = useState<DateRangeValue>(ANY_DATE)
  const [backlogFrom, setBacklogFrom] = useState(() => format(subDays(new Date(), BACKLOG_DEFAULT_DAYS), 'yyyy-MM-dd'))
  const { selected, toggle, setAll, clear } = useSelection<number>()
  /** "Select all N failed": every failed email, also on other pages. */
  const [allFailed, setAllFailed] = useState(false)
  const [historyId, setHistoryId] = useState<number | null>(null)
  const [confirming, setConfirming] = useState<{ target: ResendBody; sent: number } | null>(null)

  const listParams = useMemo<EmailListParams>(
    () => ({ page, limit: pageSize, status: tab === 'BACKLOG' ? 'ALL' : tab, search: search.trim() || undefined, template: template || undefined, from: range.startDate || undefined, to: range.endDate || undefined }),
    [page, tab, search, template, range]
  )
  const { data: summary } = useGetEmailSummaryQuery()
  const { data: backlog, isLoading: backlogLoading, isError: backlogError } = useGetEmailBacklogQuery(backlogFrom)
  const { data: templates } = useGetEmailTemplatesQuery()
  const eventOptions = useMemo(() => [{ value: '', label: 'All events' }, ...(templates ?? []).map((item) => ({ value: item.template, label: item.label }))], [templates])
  const { data, isLoading, isFetching, isError } = useGetEmailsQuery(listParams, { skip: tab === 'BACKLOG' })
  const [resend, { isLoading: resending }] = useResendEmailsMutation()
  const flashIds = useEmailLive(listParams)

  const rows = useMemo(() => data?.data ?? [], [data])
  const selectedRows = rows.filter((row) => selected.has(row.id))
  const selectedCount = allFailed ? (summary?.failed ?? 0) : selected.size
  const sentSelected = allFailed ? 0 : selectedRows.filter((row) => row.status === 'SENT').length

  const clearSelection = () => {
    clear()
    setAllFailed(false)
  }
  /** Changing what the list shows starts it again from page one with nothing ticked. */
  const refilter = (change: () => void) => {
    change()
    setPage(1)
    clearSelection()
  }

  const run = async (target: ResendBody) => {
    try {
      const result = await resend(target).unwrap()
      success(resendMessage(result))
      clearSelection()
    } catch (error) {
      failure(error, 'Could not resend the emails')
    } finally {
      setConfirming(null)
    }
  }
  /** Emails already delivered ask first, since the person gets them twice. */
  const requestResend = (target: ResendBody, sent: number) => (sent > 0 ? setConfirming({ target, sent }) : void run(target))

  const copyRecipient = async (row: EmailRow) => {
    try {
      await navigator.clipboard.writeText(row.toAddress)
      info(`Copied ${row.toAddress}`)
    } catch {
      failure(undefined, 'Could not copy the address')
    }
  }

  const count = (value: number | undefined) => (value === undefined ? '' : ` ${value.toLocaleString('en-CA')}`)
  const tabs = [
    { id: 'ALL', label: `All${count(summary?.all)}` },
    { id: 'FAILED', label: `Failed${count(summary?.failed)}` },
    { id: 'QUEUED', label: `Queued${count(summary?.queued)}` },
    { id: 'SENT', label: `Sent${count(summary?.sent)}` },
    { id: 'BACKLOG', label: `Not yet emailed${count(backlog?.totalEmailsToSend)}` },
  ]
  const filtered = Boolean(search.trim() || template || range.startDate)
  const status: EmailStatus | undefined = tab === 'ALL' || tab === 'BACKLOG' ? undefined : tab

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard title="Sent in the last 24 hours" value={(summary?.sentLast24h ?? 0).toLocaleString('en-CA')} />
        <KpiCard title="Queued, sending now" value={(summary?.queued ?? 0).toLocaleString('en-CA')} />
        <KpiCard title="Failed, needs a resend" value={(summary?.failed ?? 0).toLocaleString('en-CA')} className={summary?.failed ? 'border-danger-200 bg-danger-50' : undefined} />
        <KpiCard title="Not yet emailed" subtitle="Existing data, no email yet" value={(backlog?.totalEmailsToSend ?? 0).toLocaleString('en-CA')} />
      </div>

      <div className="mb-4 max-w-full overflow-x-auto">
        <Tabs items={tabs} activeTab={tab} onChange={(id) => refilter(() => setTab(id as ScreenTab))} />
      </div>

      {tab === 'BACKLOG' ? (
        <BacklogPanel backlog={backlog} loading={backlogLoading} error={backlogError} from={backlogFrom} onFromChange={setBacklogFrom} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm">
            <input type="search" value={search} onChange={(event) => refilter(() => setSearch(event.target.value))} placeholder="Search recipient or subject" aria-label="Search" className="ds-input ds-input-default w-full max-w-sm rounded-lg" />
            <div className="w-full sm:w-56">
              <FormField label="Event" htmlFor="email-event">
                <SearchableSelect<{ value: string; label: string }>
                  id="email-event"
                  options={eventOptions}
                  getKey={(option) => option.value}
                  getLabel={(option) => option.label}
                  value={eventOptions.find((option) => option.value === template) ?? eventOptions[0]}
                  onChange={(option) => refilter(() => setTemplate(option.value))}
                />
              </FormField>
            </div>
            <ListDateFilter value={range} onApply={(next) => refilter(() => setRange(next))} />
          </div>

          {selectedCount > 0 && (
            <EmailBulkBar summary={`${selectedCount.toLocaleString('en-CA')} selected`} note={sentSelected > 0 ? `${sentSelected} sent email${sentSelected === 1 ? '' : 's'} in the selection will ask for confirmation` : 'Resend sends the email again, even if it was sent before'}>
              <Button type="button" size="sm" variant="outline" className="bg-white" isLoading={resending} onClick={() => requestResend(allFailed ? { allFailed: true } : { ids: [...selected] }, sentSelected)}>
                Resend selected
              </Button>
              {!allFailed && (summary?.failed ?? 0) > 0 && (
                <BulkLink
                  onClick={() => {
                    clear()
                    setAllFailed(true)
                  }}
                >
                  Select all {summary?.failed.toLocaleString('en-CA')} failed
                </BulkLink>
              )}
              <BulkLink onClick={clearSelection}>Clear</BulkLink>
            </EmailBulkBar>
          )}

          <div className={isFetching && !isLoading ? 'space-y-3 opacity-70 transition-opacity' : 'space-y-3'}>
            <EmailTable
              rows={rows}
              loading={isLoading}
              error={isError}
              emptyText={filtered || status ? 'No email matches.' : 'No email has been sent yet.'}
              isChecked={(row) => (allFailed ? row.status === 'FAILED' : selected.has(row.id))}
              onToggle={(row) => {
                if (allFailed) clearSelection()
                toggle(row.id)
              }}
              onToggleAll={(on) => {
                setAllFailed(false)
                setAll(rows.map((row) => row.id), on)
              }}
              flashIds={flashIds}
              onHistory={(row) => setHistoryId(row.id)}
              onResend={(row) => requestResend({ ids: [row.id] }, row.status === 'SENT' ? 1 : 0)}
              onCopy={copyRecipient}
            />
            {data && data.totalRecords > 0 && (
              <PaginationFooter selectablePageSize
                page={data.page}
                pageSize={data.limit}
                totalItems={data.totalRecords}
                totalPages={data.totalPages}
                onPageChange={(next) => {
                  setPage(next)
                  clearSelection()
                }}
                itemLabel="emails"
              />
            )}
          </div>
        </>
      )}

      <EmailHistoryDialog emailId={historyId} busy={resending} onResend={(id, emailStatus) => requestResend({ ids: [id] }, emailStatus === 'SENT' ? 1 : 0)} onClose={() => setHistoryId(null)} />

      <ConfirmDialog isOpen={confirming !== null} title="Send these emails again?" confirmLabel="Resend anyway" busy={resending} onConfirm={() => confirming && run({ ...confirming.target, includeSent: true })} onClose={() => setConfirming(null)}>
        {confirming?.sent === 1 ? 'This email was already delivered.' : `${confirming?.sent} of these emails were already delivered.`} Sending again means the person gets it twice. Every send is kept in its delivery history.
      </ConfirmDialog>
    </>
  )
}
