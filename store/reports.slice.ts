import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ReportFilters, ReportType, ReportSchedule } from '@/services/api/reports.api'

interface ReportsState {
  filters: ReportFilters
  reportType: ReportType
  schedule: ReportSchedule
  isScheduleModalOpen: boolean
}

const initialState: ReportsState = {
  filters: {
    accountId: '',
  },
  reportType: 'profit',
  schedule: 'monthly',
  isScheduleModalOpen: false,
}

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setReportFilters: (state, action: PayloadAction<ReportFilters>) => {
      state.filters = action.payload
    },
    setReportType: (state, action: PayloadAction<ReportType>) => {
      state.reportType = action.payload
    },
    setReportSchedule: (state, action: PayloadAction<ReportSchedule>) => {
      state.schedule = action.payload
    },
    setScheduleModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isScheduleModalOpen = action.payload
    },
  },
})

export const { setReportFilters, setReportType, setReportSchedule, setScheduleModalOpen } =
  reportsSlice.actions

export default reportsSlice.reducer

