import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WaterPoint, Alert, MaintenanceQueueItem, User } from '../types'

interface WaterStore {
  waterPoints: WaterPoint[]
  selectedPointId: string | null
  alerts: Alert[]
  maintenanceQueue: MaintenanceQueueItem[]
  user: User | null
  isLoading: boolean
  error: string | null

  setWaterPoints: (points: WaterPoint[]) => void
  setSelectedPoint: (id: string | null) => void
  setAlerts: (alerts: Alert[]) => void
  setMaintenanceQueue: (queue: MaintenanceQueueItem[]) => void
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  resolveAlert: (alertId: string) => void
  logout: () => void
}

export const useWaterStore = create<WaterStore>()(
  persist(
    (set) => ({
      waterPoints: [],
      selectedPointId: null,
      alerts: [],
      maintenanceQueue: [],
      user: null,
      isLoading: false,
      error: null,

      setWaterPoints: (points) => set({ waterPoints: points }),
      setSelectedPoint: (id) => set({ selectedPointId: id }),
      setAlerts: (alerts) => set({ alerts }),
      setMaintenanceQueue: (queue) => set({ maintenanceQueue: queue }),
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      resolveAlert: (alertId) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === alertId ? { ...a, resolved: true } : a
          ),
        })),
      logout: () => {
        localStorage.removeItem('access_token')
        set({ user: null })
      },
    }),
    {
      name: 'aquawatch-store',
      partialize: (state) => ({ user: state.user, selectedPointId: state.selectedPointId }),
    }
  )
)
