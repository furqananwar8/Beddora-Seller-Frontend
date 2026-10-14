import { useCallback, useEffect, useRef, useState } from 'react'
import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { ExportEventData, ExportFormat, ExportReport, useRequestExportMutation } from '@/services/api/exports.api'
import { RealtimeMessage } from '@/services/realtime/topics'
import { downloadApiFile } from '@/utils/downloadFile'
import { useApiFeedback } from './useApiFeedback'

type ExportMessage = RealtimeMessage<ExportEventData>

/** If the server never announces the file (dropped connection), the button frees itself after this long. */
const EXPORT_GIVE_UP_MS = 5 * 60 * 1000

export const EXPORT_IN_PROGRESS_MESSAGE = 'An export is already in progress. Please wait for it to finish downloading.'

/**
 * Exports a report in the background: queues it, then downloads the file as soon as the server announces it
 * over SSE (`export.ready`). Only exports this hook started are downloaded, so other tabs and screens stay quiet.
 *
 * One export at a time per hook: a second request is refused until the first has been downloaded (or has
 * failed), so repeated clicks can't queue identical files.
 */
export function useReportExport(report: ExportReport) {
  const [requestExport] = useRequestExportMutation()
  const { success, failure, info } = useApiFeedback()
  const [isExporting, setIsExporting] = useState(false)
  /** Set synchronously, so two clicks in the same tick can't both get through before state updates. */
  const busy = useRef(false)
  const mine = useRef(new Set<string>())
  /** An event can beat the POST response; keep it until the job id is known. */
  const early = useRef(new Map<string, ExportMessage>())
  const giveUp = useRef<ReturnType<typeof setTimeout>>()

  const release = useCallback(() => {
    clearTimeout(giveUp.current)
    busy.current = false
    setIsExporting(false)
  }, [])

  useEffect(() => () => clearTimeout(giveUp.current), [])

  const settle = useCallback(
    async (message: ExportMessage) => {
      const { jobId, fileName, downloadPath } = message.data
      if (!mine.current.delete(jobId)) return
      try {
        if (message.type === 'export.failed' || !downloadPath) return failure(null, 'The export failed. Please try again.')
        await downloadApiFile(downloadPath, fileName ?? `${report}.xlsx`)
        success('Your export is ready and has been downloaded.')
      } catch (error) {
        failure(error, 'Could not download the export')
      } finally {
        release()
      }
    },
    [failure, release, report, success]
  )

  useRealtime('export', (message) => {
    const event = message as ExportMessage
    if (event.data.report !== report) return
    if (mine.current.has(event.data.jobId)) void settle(event)
    else early.current.set(event.data.jobId, event)
  })

  const start = useCallback(
    async (format: ExportFormat, filters: Record<string, unknown>) => {
      if (busy.current) return info(EXPORT_IN_PROGRESS_MESSAGE)
      busy.current = true
      setIsExporting(true)
      giveUp.current = setTimeout(() => {
        mine.current.clear()
        release()
        failure(null, 'The export is taking too long. Please try again.')
      }, EXPORT_GIVE_UP_MS)
      try {
        const { jobId } = await requestExport({ report, format, filters }).unwrap()
        mine.current.add(jobId)
        info('Preparing your export. It will download automatically when it is ready.')
        const arrived = early.current.get(jobId)
        if (arrived) {
          early.current.delete(jobId)
          void settle(arrived)
        }
      } catch (error) {
        release()
        failure(error, 'Could not start the export')
      }
    },
    [failure, info, release, report, requestExport, settle]
  )

  return { start, isExporting }
}
