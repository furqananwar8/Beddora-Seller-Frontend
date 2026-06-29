import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * UI state slice
 * 
 * Manages UI-related state (sidebar, modals, theme, etc.)
 * Add more UI state as needed (notifications, loading states, etc.)
 */

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  activeModal: string | null
  notifications: Notification[]
}

interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  timestamp: number
}

const initialState: UIState = {
  sidebarOpen: true,
  theme: 'light',
  activeModal: null,
  notifications: [],
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.activeModal = action.payload
    },
    closeModal: (state) => {
      state.activeModal = null
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
      }
      state.notifications.push(notification)
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload)
    },
  },
})

export const { toggleSidebar, setSidebarOpen, setTheme, openModal, closeModal, addNotification, removeNotification } = uiSlice.actions
export default uiSlice.reducer

