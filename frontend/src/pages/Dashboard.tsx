import { useEffect } from 'react'
import { MetricsGrid } from '../components/Dashboard/MetricsGrid'
import { AlertPanel } from '../components/Dashboard/AlertPanel'
import { TrendChart } from '../components/Dashboard/TrendChart'
import { useWaterStore } from '../store/useWaterStore'
import { waterPointsApi, readingsApi } from '../api/waterPoints'
import { alertsApi } from '../api/ai'
import { maintenanceApi } from '../api/maintenance'
import { useState } from 'react'
import type { Reading } from '../types'

export default function Dashboard() {
  const { waterPoints, alerts, maintenanceQueue, selectedPointId, setWaterPoints, setAlerts, setMaintenanceQueue, setLoading } = useWaterStore()
  const [readings, setReadings] = useState<Reading[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      waterPointsApi.list(),
      alertsApi.list({ resolved: false }),
      maintenanceApi.getQueue(),
    ]).then(([points, alerts, queue]) => {
      setWaterPoints(points)
      setAlerts(alerts)
      setMaintenanceQueue(queue)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedPointId) {
      if (waterPoints.length > 0) {
        readingsApi.list(waterPoints[0].id, { limit: 30 }).then(setReadings).catch(() => {})
      }
      return
    }
    readingsApi.list(selectedPointId, { limit: 30 }).then(setReadings).catch(() => {})
  }, [selectedPointId, waterPoints])

  const selectedPoint = waterPoints.find((p) => p.id === selectedPointId) ?? waterPoints[0]

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Water Quality Dashboard</h1>
          <p className="text-sm text-muted mt-1">West Africa & Southern Africa — {waterPoints.length} monitoring points</p>
        </div>
      </div>

      <MetricsGrid waterPoints={waterPoints} alerts={alerts} maintenanceQueue={maintenanceQueue} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TrendChart
            readings={readings}
            title={selectedPoint ? `${selectedPoint.name} — Quality Trends` : 'Quality Trends'}
          />
        </div>
        <AlertPanel alerts={alerts} />
      </div>
    </div>
  )
}
