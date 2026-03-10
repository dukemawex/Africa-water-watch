import { useState } from 'react'
import type { MaintenanceQueueItem } from '../../types'
import { maintenanceApi } from '../../api/maintenance'
import { StatusBadge } from '../shared/StatusBadge'

interface ServiceSchedulerProps {
  item: MaintenanceQueueItem
  onScheduled?: () => void
}

const SERVICE_TYPES = [
  { value: 'pump_repair', label: 'Pump Repair' },
  { value: 'chemical_treatment', label: 'Chemical Treatment' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'chlorination', label: 'Chlorination' },
  { value: 'filter_replace', label: 'Filter Replace' },
  { value: 'full_inspection', label: 'Full Inspection' },
]

export function ServiceScheduler({ item, onScheduled }: ServiceSchedulerProps) {
  const [form, setForm] = useState({
    service_type: 'full_inspection',
    technician: '',
    scheduled_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16),
    cost_usd: String(item.estimated_cost_usd),
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    try {
      await maintenanceApi.schedule({
        water_point_id: item.water_point_id,
        service_type: form.service_type as any,
        technician: form.technician || undefined,
        scheduled_date: new Date(form.scheduled_date).toISOString(),
        cost_usd: parseFloat(form.cost_usd) || undefined,
        notes: form.notes || undefined,
        urgency: item.urgency_level,
        triggered_by: item.triggered_by,
      })
      setSuccess(true)
      setConfirm(false)
      onScheduled?.()
    } catch {
      // silent
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-teal-400 text-2xl">✓</span>
        </div>
        <p className="font-medium text-white">Service Scheduled</p>
        <p className="text-sm text-muted mt-1">Maintenance scheduled for {new Date(form.scheduled_date).toLocaleDateString()}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Triggered rules */}
      {item.triggered_by.length > 0 && (
        <div className="bg-navy-700 rounded-lg p-3">
          <p className="text-xs font-medium text-muted mb-2">Triggered Rules</p>
          <ul className="space-y-1">
            {item.triggered_by.map((rule) => (
              <li key={rule} className="flex items-center gap-2 text-xs text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted mb-1">Service Type</label>
          <select
            value={form.service_type}
            onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))}
            className="w-full bg-navy-700 border border-navy-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
          >
            {SERVICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Scheduled Date</label>
          <input
            type="datetime-local"
            value={form.scheduled_date}
            onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
            className="w-full bg-navy-700 border border-navy-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Technician</label>
          <input
            type="text"
            placeholder="Name..."
            value={form.technician}
            onChange={(e) => setForm((f) => ({ ...f, technician: e.target.value }))}
            className="w-full bg-navy-700 border border-navy-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Estimated Cost (USD)</label>
          <input
            type="number"
            value={form.cost_usd}
            onChange={(e) => setForm((f) => ({ ...f, cost_usd: e.target.value }))}
            className="w-full bg-navy-700 border border-navy-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Notes</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Additional notes..."
          className="w-full bg-navy-700 border border-navy-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500 resize-none"
        />
      </div>

      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors text-sm"
        >
          Schedule Service
        </button>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-3">
          <p className="text-sm text-amber-400 font-medium">Confirm scheduling?</p>
          <p className="text-xs text-muted">
            {SERVICE_TYPES.find((t) => t.value === form.service_type)?.label} on{' '}
            {new Date(form.scheduled_date).toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 bg-teal-500 text-white text-sm rounded-lg">
              {loading ? 'Saving...' : 'Confirm'}
            </button>
            <button onClick={() => setConfirm(false)} className="flex-1 py-2 bg-navy-700 text-muted text-sm rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
