'use client'

import React from 'react'
import { Provider } from 'react-redux'
import { persistor, store } from '@/store/store'
import { ToastContainer } from '@/components/feedback'
import { AuthInitializer } from '@/components/navigation/AuthInitializer'
import { RouteGuard } from '@/components/navigation/RouteGuard'
import { PersistGate } from 'redux-persist/integration/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthInitializer>
          <RouteGuard>
            {children}
            <ToastContainer />
          </RouteGuard>
        </AuthInitializer>
      </PersistGate>
    </Provider>
  )
}