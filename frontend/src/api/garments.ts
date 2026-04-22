import type { Garment } from '../types'

const BASE = '/api/garments'

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const uploadGarment = async (file: File): Promise<Garment> => {
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(BASE, { method: 'POST', body: form })
  return handleResponse<Garment>(res)
}

export const fetchGarments = async (): Promise<Garment[]> => {
  const res = await fetch(BASE)
  return handleResponse<Garment[]>(res)
}

export const overrideClassification = async (
  id: string,
  override: { type?: string; material?: string; damage?: string; complexity?: string; notes?: string }
): Promise<Garment> => {
  const res = await fetch(`${BASE}/${id}/override`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(override),
  })
  return handleResponse<Garment>(res)
}

export const completeGarment = async (id: string): Promise<Garment> => {
  const res = await fetch(`${BASE}/${id}/complete`, { method: 'PATCH' })
  return handleResponse<Garment>(res)
}

export const getImageUrl = (filename: string) => `/api/garments/images/${filename}`
