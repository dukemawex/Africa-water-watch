import { useEffect, useState } from 'react'
import { maintenanceApi } from '../api/maintenance'
import { readingsApi } from '../api/waterPoints'
import type { MaintenanceQueueItem, ServiceLog } from '../types'
import { StatusBadge } from '../components/shared/StatusBadge'
import { ServiceScheduler } from '../components/Maintenance/ServiceScheduler'
import { TreatmentAdvisor } from '../components/Maintenance/TreatmentAdvisor'
import { ServiceHistory } from '../components/Maintenance/ServiceHistory'
import { COUNTRY_FLAGS } from '../types'
import { Search } from 'lucide-react'
import clsx from 'clsx'

const TABS = ['Schedule', 'Treatment Plan', 'History'] as const

export default function Maintenance() {
  const [queue, setQueue] = useState<MaintenanceQueueItem[]>([])
  const [selected, setSelected] = useState<MaintenanceQueueItem | null>(null)
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Schedule')
  const [search, setSearch] = useState('')
  const [logs, setLogs] = useState<ServiceLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    maintenanceApi.getQueue().then((q) => {
      setQueue(q)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    fetch(`/api/maintenance/${selected.water_point_id}/assessment`).catch(() => {})
    // Load service logs for history tab
    fetch(`/api/maintenance/treatment-plans/${selected.water_point_id}`)
      .then((r) => r.json())
      .then((plans) => {
        if (Array.isArray(plans)) setLogs([])
      })
      .catch(() => {})
  }, [selected])

  const filtered = queue.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.country ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const urgencyColors: Record<string, string> = {
    critical: 'bg-danger-500/10 border-danger-500/30',
    high: 'bg-orange-500/10 border-orange-500/30',
    medium: 'bg-yellow-500/10 border-yellow-500/30',
    low: 'bg-blue-500/10 border-blue-500/30',
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Maintenance Queue</h1>
        <p className="text-sm text-muted mt-1">{queue.length} water points require attention</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search by name or country…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-navy-800 border border-navy-700 text-white text-sm rounded-xl focus:outline-none focus:border-teal-500"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Queue table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700">
                {['Water Point', 'Type', 'Days Overdue', 'Urgency', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs text-muted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((__, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 bg-navy-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted">No items found</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.water_point_id}
                    onClick={() => setSelected(item)}
                    className={clsx(
                      'cursor-pointer hover:bg-navy-800 transition-colors',
                      selected?.water_point_id === item.water_point_id && 'bg-navy-800'
                    )}
                  >
                    <td className="px-3 py-3">
                      <p className="font-medium text-white text-xs truncate max-w-36">{item.name}</p>
                      <p className="text-xs text-muted">{COUNTRY_FLAGS[item.country ?? ''] ?? '🌍'} {item.country}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted capitalize">{item.type}</td>
                    <td className="px-3 py-3 font-data text-xs">
                      <span className={item.days_until_due < 0 ? 'text-danger-500' : 'text-teal-400'}>
                        {Math.abs(item.days_until_due)}d {item.days_until_due < 0 ? 'overdue' : 'due'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={item.urgency_level} size="sm" pulse={item.urgency_level === 'critical'} />
                    </td>
                    <td className="px-3 py-3">
                      <button className="text-xs text-teal-400 hover:text-teal-300">Details →</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="bg-navy-800 border border-navy-700 rounded-xl">
            <div className="p-4 border-b border-navy-700">
              <h3 className="font-heading font-semibold text-white">{selected.name}</h3>
              <p className="text-xs text-muted mt-0.5">{COUNTRY_FLAGS[selected.country ?? ''] ?? '🌍'} {selected.country} · {selected.type}</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-navy-700">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'flex-1 py-3 text-xs font-medium transition-colors',
                    activeTab === tab ? 'text-teal-400 border-b-2 border-teal-500' : 'text-muted hover:text-white'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {activeTab === 'Schedule' && (
                <ServiceScheduler item={selected} onScheduled={() => maintenanceApi.getQueue().then(setQueue)} />
              )}
              {activeTab === 'Treatment Plan' && (
                <TreatmentAdvisor item={selected} />
              )}
              {activeTab === 'History' && (
                <ServiceHistory logs={logs} />
              )}
            </div>
          </div>
        ) : (
          <div className="bg-navy-800 border border-navy-700 rounded-xl flex items-center justify-center text-muted text-sm">
            Select a water point to view details
          </div>
        )}
      </div>
    </div>
  )
}
