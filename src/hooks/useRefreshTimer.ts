import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Hook that provides a countdown timer for SWR refresh intervals
 * @param refreshInterval - The refresh interval in milliseconds (e.g., 60000 for 60 seconds)
 * @returns Object with secondsUntilRefresh and resetTimer function
 */
export function useRefreshTimer(refreshInterval: number): {
  secondsUntilRefresh: number
  resetTimer: () => void
} {
  const refreshIntervalSeconds = Math.floor(refreshInterval / 1000)
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(refreshIntervalSeconds)
  const intervalSecondsRef = useRef(refreshIntervalSeconds)

  // Update ref when interval changes
  useEffect(() => {
    intervalSecondsRef.current = refreshIntervalSeconds
  }, [refreshIntervalSeconds])

  const resetTimer = useCallback(() => {
    setSecondsUntilRefresh(intervalSecondsRef.current)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          // Reset to full interval when reaching 0
          return intervalSecondsRef.current
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return { secondsUntilRefresh, resetTimer }
}
