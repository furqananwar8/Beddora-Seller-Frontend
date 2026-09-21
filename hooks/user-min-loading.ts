import { useState, useEffect, useRef } from 'react'

/**
 * Ensures a loading state stays active for at least `minDuration` ms
 * to prevent jarring UI flicker on instant API responses.
 */
export function useMinLoading(isLoading: boolean, minDuration: number = 300): boolean {
  const [showLoading, setShowLoading] = useState(false)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now()
      setShowLoading(true)
    } else if (showLoading) {
      const elapsedTime = Date.now() - (startTimeRef.current || 0)
      const remainingTime = Math.max(0, minDuration - elapsedTime)

      const timer = setTimeout(() => {
        setShowLoading(false)
        startTimeRef.current = null
      }, remainingTime)

      return () => clearTimeout(timer)
    }
  }, [isLoading, minDuration, showLoading])

  return showLoading
}