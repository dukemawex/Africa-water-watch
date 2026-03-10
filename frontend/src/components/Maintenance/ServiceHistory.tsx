import type { ServiceLog } from '../../types'
import { StatusBadge } from '../shared/StatusBadge'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface ServiceHistoryProps {
  logs: ServiceLog[]
}

export function ServiceHistory({ logs }: ServiceHistoryProps) {
  function exportCSV() {
    const headers = ['Date', 'Technician', 'Service Type', 'Cost USD', 'Status', 'Before Score', 'After Score', 'Notes']
    const rows = logs.map((l) => [
      new Date(l.scheduled_date).toLocaleDateString(),
      l.technician ?? '',
      l.service_type,
      l.cost_usd ?? '',
      l.status,
      l.before_score ?? '',
      l.after_score ?? '',
      (l.notes ?? '').replace(/,/g, ';'),
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'service_history.csv'
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={exportCSV}
          className="text-xs text-muted hover:text-white px-3 py-1.5 border border-navy-700 rounded-lg transition-colors"
        >
          Export CSV
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="text-center text-muted text-sm py-8">No service history</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-navy-700" />

          <div className="space-y-4 pl-12">
            {logs.map((log) => {
              const scoreDelta = log.after_score != null && log.before_score != null
                ? log.after_score - log.before_score
                : null
              return (
                <div key={log.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-8 w-3 h-3 rounded-full bg-teal-500 border-2 border-navy-950 top-3" />

                  <div className="bg-navy-700 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-xs text-muted">{new Date(log.scheduled_date).toLocaleDateString()}</p>
                        <p className="text-sm font-medium text-white capitalize">{log.service_type.replace('_', ' ')}</p>
                      </div>
                      <StatusBadge status={log.status} size="sm" />
                    </div>

                    {log.technician && (
                      <p className="text-xs text-muted">Technician: <span className="text-white">{log.technician}</span></p>
                    )}

                    {log.cost_usd != null && (
                      <p className="text-xs text-muted">Cost: <span className="font-data text-white">${log.cost_usd}</span></p>
                    )}

                    {scoreDelta != null && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-xs text-muted font-data">{log.before_score?.toFixed(0)} → {log.after_score?.toFixed(0)}</span>
                        {scoreDelta > 0 ? (
                          <TrendingUp className="w-3 h-3 text-teal-400" />
                        ) : scoreDelta < 0 ? (
                          <TrendingDown className="w-3 h-3 text-danger-500" />
                        ) : null}
                        <span className={`text-xs font-data ${scoreDelta > 0 ? 'text-teal-400' : 'text-danger-500'}`}>
                          {scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {log.notes && (
                      <p className="text-xs text-muted mt-2 leading-relaxed">{log.notes}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
