import { useState } from 'react'
import { AlertTriangle, Info, X, CheckCircle } from 'lucide-react'
import type { Alert, AlertSeverity } from '../../types'
import { alertsApi } from '../../api/ai'
import { useWaterStore } from '../../store/useWaterStore'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

interface AlertPanelProps {
  alerts: Alert[]
}

const SEVERITY_ICONS: Record<AlertSeverity, React.ElementType> = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
}

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critical: 'border-l-danger-500 bg-danger-500/5',
  warning: 'border-l-amber-500 bg-amber-500/5',
  info: 'border-l-blue-400 bg-blue-400/5',
}

const FILTER_OPTIONS = ['all', 'critical', 'warning', 'info'] as const

export function AlertPanel({ alerts }: AlertPanelProps) {
  const [filter, setFilter] = useState<'all' | AlertSeverity>('all')
  const { resolveAlert } = useWaterStore()

  const filtered = alerts.filter((a) => !a.resolved && (filter === 'all' || a.severity === filter))

  async function handleResolve(alertId: string) {
    try {
      await alertsApi.resolve(alertId)
      resolveAlert(alertId)
    } catch {
      // silent
    }
  }

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl">
      <div className="flex items-center justify-between p-4 border-b border-navy-700">
        <h3 className="font-heading font-semibold text-white">Live Alerts</h3>
        <div className="flex gap-1">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors',
                filter === f ? 'bg-teal-500/20 text-teal-400' : 'text-muted hover:text-white'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-navy-700 max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-muted text-sm flex flex-col items-center gap-2">
            <CheckCircle className="w-8 h-8 text-teal-500/50" />
            No unresolved alerts
          </div>
        ) : (
          filtered.map((alert) => {
            const Icon = SEVERITY_ICONS[alert.severity] ?? Info
            return (
              <div
                key={alert.id}
                className={clsx(
                  'flex items-start gap-3 p-4 border-l-2',
                  SEVERITY_STYLES[alert.severity]
                )}
              >
                <Icon className={clsx(
                  'w-4 h-4 mt-0.5 flex-shrink-0',
                  alert.severity === 'critical' ? 'text-danger-500' :
                  alert.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                )} />
                <div className="flex-1 min-w-0">
                  {alert.water_point_name && (
                    <p className="text-xs font-medium text-white">{alert.water_point_name}</p>
                  )}
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{alert.message}</p>
                  <p className="text-xs text-muted/60 mt-1">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={() => handleResolve(alert.id)}
                  className="flex-shrink-0 text-muted hover:text-white p-1 rounded transition-colors"
                  title="Resolve"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
