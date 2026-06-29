'use client'

import React from 'react'
import { Provider } from 'react-redux'
import { persistor, store } from '@/store/store'
import { ToastContainer } from '@/components/feedback'
import { AuthInitializer } from '@/components/navigation/AuthInitializer'
import { PersistGate } from 'redux-persist/integration/react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

/**
 * Providers component
 * Wraps the app with Redux Provider and other global providers
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
       <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
        <AuthInitializer>
          {children}
          <ToastContainer />
        </AuthInitializer>
       </PersistGate>
    </Provider>
  )
}

