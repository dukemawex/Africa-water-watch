import api from './client'
import type { WaterPoint, Reading } from '../types'

export const waterPointsApi = {
  list: (params?: { country?: string; region?: string; type?: string; status?: string }) =>
    api.get<WaterPoint[]>('/water-points', { params }).then((r) => r.data),

  get: (id: string) => api.get<WaterPoint>(`/water-points/${id}`).then((r) => r.data),

  getSummary: (id: string) => api.get(`/water-points/${id}/summary`).then((r) => r.data),

  getNearby: (lat: number, lng: number, radius_km = 50) =>
    api.get<WaterPoint[]>('/water-points/nearby', { params: { lat, lng, radius_km } }).then((r) => r.data),

  create: (data: Partial<WaterPoint>) =>
    api.post<WaterPoint>('/water-points', data).then((r) => r.data),

  update: (id: string, data: Partial<WaterPoint>) =>
    api.patch<WaterPoint>(`/water-points/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/water-points/${id}`),
}

export const readingsApi = {
  list: (waterPointId: string, params?: { limit?: number; from_date?: string; to_date?: string }) =>
    api.get<Reading[]>(`/readings/${waterPointId}`, { params }).then((r) => r.data),

  submit: (data: Partial<Reading>) =>
    api.post<Reading>('/readings', data).then((r) => r.data),
}
