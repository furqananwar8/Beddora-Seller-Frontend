import { useCallback, useRef, useState } from 'react'
import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { ExportEventData, ExportFormat, ExportReport, useRequestExportMutation } from '@/services/api/exports.api'
import { RealtimeMessage } from '@/services/realtime/topics'
import { downloadApiFile } from '@/utils/downloadFile'
import { useApiFeedback } from './useApiFeedback'

type ExportMessage = RealtimeMessage<ExportEventData>

/**
 * Exports a report in the background: queues it, then downloads the file as soon as the server announces it
 * over SSE (`export.ready`). Only exports this hook started are downloaded, so other tabs and screens stay quiet.
 */
export function useReportExport(report: ExportReport) {
  const [requestExport] = useRequestExportMutation()
  const { success, failure, info } = useApiFeedback()
  const [pending, setPending] = useState(0)
  const mine = useRef(new Set<string>())
  /** An event can beat the POST response; keep it until the job id is known. */
  const early = useRef(new Map<string, ExportMessage>())

  const settle = useCallback(
    async (message: ExportMessage) => {
      const { jobId, fileName, downloadPath } = message.data
      if (!mine.current.delete(jobId)) return
      setPending((count) => Math.max(0, count - 1))
      if (message.type === 'export.failed' || !downloadPath) return failure(null, 'The export failed. Please try again.')
      try {
        await downloadApiFile(downloadPath, fileName ?? `${report}.xlsx`)
        success('Your export is ready and has been downloaded.')
      } catch (error) {
        failure(error, 'Could not download the export')
      }
    },
    [failure, report, success]
  )

  useRealtime('export', (message) => {
    const event = message as ExportMessage
    if (event.data.report !== report) return
    if (mine.current.has(event.data.jobId)) void settle(event)
    else early.current.set(event.data.jobId, event)
  })

  const start = useCallback(
    async (format: ExportFormat, filters: Record<string, unknown>) => {
      setPending((count) => count + 1)
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
        setPending((count) => Math.max(0, count - 1))
        failure(error, 'Could not start the export')
      }
    },
    [failure, info, report, requestExport, settle]
  )

  return { start, isExporting: pending > 0 }
}
