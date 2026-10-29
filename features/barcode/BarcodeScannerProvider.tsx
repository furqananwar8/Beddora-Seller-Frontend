'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useCreateBarcodeScanMutation, type BarcodeScan } from '@/services/api/barcode.api'
import { KeyboardWedgeSource } from './scanner/KeyboardWedgeSource'
import { WebSerialSource, isWebSerialSupported, type BaudSetting, type WebSerialStatus } from './scanner/WebSerialSource'
import type { ScanEvent } from './scanner/types'
import { DESKTOP_SCANNERS_ENABLED } from './scannerConfig'

const BAUD_SETTING_KEY = 'barcode_serial_baud_setting'
/** Offered when the automatic baud rate does not suit a scanner. */
export const BAUD_RATES = [9600, 19200, 38400, 57600, 115200] as const
/** A scan that could not be saved is retried this many times, with these waits between attempts. */
const RETRY_DELAYS_MS = [1000, 3000, 8000]

interface BarcodeScannerContextValue {
  /** Scanners in keyboard mode are listened for as soon as the app is open. */
  keyboardListening: boolean
  serialSupported: boolean
  /** Serial scanners currently open. */
  serialConnected: number
  serialError?: string
  /** Set while a scanner's baud rate is being worked out (the user is asked to scan again). */
  serialNotice?: string
  /** 'auto' works out each scanner's baud rate on its first scan. */
  baudSetting: BaudSetting
  setBaudSetting: (value: BaudSetting) => void
  /** Asks the browser which serial device to allow (needs a click). Remembered for next time. */
  connectSerial: () => Promise<void>
  /** Saves a scan from a source owned by a screen (e.g. the handheld scan field), with the same retries. */
  recordScan: (scan: ScanEvent) => Promise<BarcodeScan | null>
  /** Whether this user may save scans. */
  canScan: boolean
  lastScan?: ScanEvent
  /** Scans that could not be saved even after retrying. */
  failedScans: number
}

const BarcodeScannerContext = createContext<BarcodeScannerContextValue | null>(null)

const readBaudSetting = (): BaudSetting => {
  try {
    const saved = window.localStorage.getItem(BAUD_SETTING_KEY)
    const rate = Number(saved)
    return BAUD_RATES.includes(rate as (typeof BAUD_RATES)[number]) ? rate : 'auto'
  } catch {
    return 'auto'
  }
}

/**
 * Mounted once for the whole signed-in app, so a scan is captured wherever the user is.
 * Every scanner source feeds the same path: save the scan through the API, then it shows on the Bar Code screen.
 */
export function BarcodeScannerProvider({ children }: { children: React.ReactNode }) {
  const ability = useAppAbility()
  const canScan = ability.can('write', 'barcode:scans')

  const [createScan] = useCreateBarcodeScanMutation()
  const [serialStatus, setSerialStatus] = useState<WebSerialStatus>({ connected: 0 })
  const [lastScan, setLastScan] = useState<ScanEvent>()
  const [failedScans, setFailedScans] = useState(0)
  const [baudSetting, setBaudSettingState] = useState<BaudSetting>('auto')
  const [keyboardListening, setKeyboardListening] = useState(false)

  const serialRef = useRef<WebSerialSource>()
  const createScanRef = useRef(createScan)
  createScanRef.current = createScan

  /** Resolves with the saved scan (content parsed by the server), or null when every retry failed. */
  const save = useCallback(async (scan: ScanEvent): Promise<BarcodeScan | null> => {
    setLastScan(scan)
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await createScanRef.current(scan).unwrap()
      } catch {
        if (attempt < RETRY_DELAYS_MS.length) await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]))
      }
    }
    setFailedScans((count) => count + 1)
    return null
  }, [])

  useEffect(() => {
    setBaudSettingState(readBaudSetting())
  }, [])

  useEffect(() => {
    if (!canScan || !DESKTOP_SCANNERS_ENABLED) return

    const keyboard = new KeyboardWedgeSource()
    keyboard.start(save)
    setKeyboardListening(true)

    const serial = new WebSerialSource(readBaudSetting(), setSerialStatus)
    serialRef.current = serial
    if (isWebSerialSupported()) serial.start(save)

    return () => {
      keyboard.stop()
      serial.stop()
      serialRef.current = undefined
      setKeyboardListening(false)
      setSerialStatus({ connected: 0 })
    }
  }, [canScan, save])

  const setBaudSetting = useCallback((value: BaudSetting) => {
    setBaudSettingState(value)
    serialRef.current?.setBaudSetting(value)
    try {
      window.localStorage.setItem(BAUD_SETTING_KEY, String(value))
    } catch {
      /* storage unavailable: the choice just is not remembered */
    }
  }, [])

  const connectSerial = useCallback(async () => {
    try {
      await serialRef.current?.requestAndConnect()
    } catch (error) {
      // Closing the browser's device picker is not an error
      if (error instanceof DOMException && error.name === 'NotFoundError') return
      setSerialStatus((status) => ({ ...status, error: error instanceof Error ? error.message : 'Could not connect' }))
    }
  }, [])

  const value = useMemo<BarcodeScannerContextValue>(
    () => ({
      keyboardListening,
      serialSupported: typeof navigator !== 'undefined' && isWebSerialSupported(),
      serialConnected: serialStatus.connected,
      serialError: serialStatus.error,
      serialNotice: serialStatus.notice,
      baudSetting,
      setBaudSetting,
      connectSerial,
      recordScan: save,
      canScan,
      lastScan,
      failedScans,
    }),
    [keyboardListening, serialStatus, baudSetting, setBaudSetting, connectSerial, save, canScan, lastScan, failedScans]
  )

  return <BarcodeScannerContext.Provider value={value}>{children}</BarcodeScannerContext.Provider>
}

export function useBarcodeScanner(): BarcodeScannerContextValue {
  const context = useContext(BarcodeScannerContext)
  if (!context) throw new Error('useBarcodeScanner must be used inside BarcodeScannerProvider')
  return context
}
