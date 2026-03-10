import api from './client'
import type { ServiceLog, TreatmentPlan, MaintenanceQueueItem, ServiceAssessment } from '../types'

export const maintenanceApi = {
  getQueue: () =>
    api.get<MaintenanceQueueItem[]>('/maintenance/queue').then((r) => r.data),

  getAssessment: (waterPointId: string) =>
    api.get<ServiceAssessment>(`/maintenance/${waterPointId}/assessment`).then((r) => r.data),

  schedule: (data: Partial<ServiceLog>) =>
    api.post<ServiceLog>('/maintenance/schedule', data).then((r) => r.data),

  complete: (logId: string, data: { completed_date: string; after_score?: number; notes?: string }) =>
    api.post<ServiceLog>(`/maintenance/${logId}/complete`, data).then((r) => r.data),

  generateTreatmentPlan: (waterPointId: string) =>
    api.post<TreatmentPlan>(`/maintenance/treatment-plan/${waterPointId}`).then((r) => r.data),

  getTreatmentPlans: (waterPointId: string) =>
    api.get<TreatmentPlan[]>(`/maintenance/treatment-plans/${waterPointId}`).then((r) => r.data),
}
