import { useEffect, useState } from 'react'
import { alertsApi } from '../api/ai'
import type { Alert } from '../types'
import { AlertPanel } from '../components/Dashboard/AlertPanel'
import { useWaterStore } from '../store/useWaterStore'

export default function Alerts() {
  const { alerts, setAlerts } = useWaterStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    alertsApi.list({ resolved: false }).then((a) => {
      setAlerts(a)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Alerts</h1>
        <p className="text-sm text-muted mt-1">
          {alerts.filter((a) => !a.resolved).length} unresolved alerts
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-navy-800 border border-navy-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <AlertPanel alerts={alerts} />
      )}
    </div>
  )
}
