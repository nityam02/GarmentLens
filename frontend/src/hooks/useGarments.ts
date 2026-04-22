import { useState, useEffect, useCallback } from 'react'
import { fetchGarments, completeGarment as apiComplete, overrideClassification as apiOverride } from '../api/garments'
import type { Garment } from '../types'

const POLL_INTERVAL_MS = 5000

export const useGarments = () => {
  const [garments, setGarments] = useState<Garment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchGarments()
      setGarments(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load garments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  const addGarment = useCallback((garment: Garment) => {
    setGarments((prev) => [garment, ...prev])
  }, [])

  const updateGarment = useCallback((updated: Garment) => {
    setGarments((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
  }, [])

  const markComplete = useCallback(
    async (id: string) => {
      const updated = await apiComplete(id)
      updateGarment(updated)
    },
    [updateGarment]
  )

  const saveOverride = useCallback(
    async (id: string, override: Parameters<typeof apiOverride>[1]) => {
      const updated = await apiOverride(id, override)
      updateGarment(updated)
    },
    [updateGarment]
  )

  return { garments, loading, error, addGarment, markComplete, saveOverride, refresh: load }
}
