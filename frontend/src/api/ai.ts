import api from './client'
import type { Alert } from '../types'

export const aiApi = {
  analyze: (waterPointId: string, question?: string, language = 'english') =>
    `${api.defaults.baseURL}/ai/analyze`,

  chat: (waterPointId: string, messages: { role: string; content: string }[], language = 'english') =>
    api.post('/ai/chat', { water_point_id: waterPointId, messages, language }),
}

export const alertsApi = {
  list: (params?: { severity?: string; resolved?: boolean; water_point_id?: string }) =>
    api.get<Alert[]>('/alerts', { params }).then((r) => r.data),

  resolve: (alertId: string) =>
    api.post<Alert>(`/alerts/${alertId}/resolve`).then((r) => r.data),
}
