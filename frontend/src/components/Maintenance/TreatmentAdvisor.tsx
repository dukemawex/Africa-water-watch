import { useState, useCallback } from 'react'
import type { TreatmentPlan, MaintenanceQueueItem } from '../../types'
import { maintenanceApi } from '../../api/maintenance'
import { StatusBadge } from '../shared/StatusBadge'
import { CURRENCY_MAP } from '../../types'
import { ChevronDown, ChevronUp, Printer, Share2 } from 'lucide-react'

interface TreatmentAdvisorProps {
  item: MaintenanceQueueItem
}

function WaterRipple() {
  return (
    <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border-2 border-teal-500"
          style={{
            width: `${(i + 1) * 28}px`,
            height: `${(i + 1) * 28}px`,
            animation: `ripple 1.5s ease-out ${i * 0.4}s infinite`,
            opacity: 1 - i * 0.3,
          }}
        />
      ))}
      <span className="text-2xl">💧</span>
    </div>
  )
}

function StepAccordion({ step }: { step: { step: number; method: string; materials: string; duration: string; cost_usd: number } }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-navy-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-navy-700 hover:bg-navy-600 transition-colors text-sm"
      >
        <span className="text-white font-medium">Step {step.step}: {step.method}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-data">${step.cost_usd}</span>
          {open ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </div>
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2 bg-navy-800 text-sm">
          <p><span className="text-muted">Materials:</span> <span className="text-white">{step.materials}</span></p>
          <p><span className="text-muted">Duration:</span> <span className="text-white">{step.duration}</span></p>
        </div>
      )}
    </div>
  )
}

export function TreatmentAdvisor({ item }: TreatmentAdvisorProps) {
  const [plan, setPlan] = useState<TreatmentPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [pastPlans, setPastPlans] = useState<TreatmentPlan[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const currency = CURRENCY_MAP[item.country] ?? { code: 'USD', rate: 1 }

  const generatePlan = useCallback(async () => {
    setLoading(true)
    try {
      const [newPlan, history] = await Promise.all([
        maintenanceApi.generateTreatmentPlan(item.water_point_id),
        maintenanceApi.getTreatmentPlans(item.water_point_id),
      ])
      setPlan(newPlan)
      setPastPlans(history.slice(0, 5))
    } catch {
      // silent
    }
    setLoading(false)
  }, [item.water_point_id])

  function handlePrint() {
    window.print()
  }

  function handleShare() {
    if (!plan) return
    navigator.clipboard.writeText(
      `AquaWatch Africa — ${item.name}\n\n${plan.summary}\n\nUrgency: ${plan.urgency}\nSafe to drink: ${plan.safe_to_drink ? 'YES' : 'NO'}`
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <WaterRipple />
        <p className="text-teal-400 font-medium animate-pulse">Analysing water quality…</p>
        <p className="text-xs text-muted">AI model processing local geological context</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <button
          onClick={generatePlan}
          className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors"
        >
          Generate AI Treatment Plan
        </button>
        {pastPlans.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted mb-3">Past Plans</p>
            <div className="space-y-2">
              {pastPlans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlan(p)}
                  className="w-full flex items-center justify-between p-3 bg-navy-700 hover:bg-navy-600 rounded-lg transition-colors text-sm"
                >
                  <span className="text-white">{new Date(p.generated_at).toLocaleDateString()}</span>
                  <StatusBadge status={p.urgency} size="sm" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const totalLocal = (plan.estimated_cost_usd ?? 0) * currency.rate

  return (
    <div className="space-y-5">
      {/* Safety banner */}
      <div className={`rounded-xl p-4 text-center font-heading font-bold text-xl ${
        plan.safe_to_drink ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-danger-500/20 text-danger-500 border border-danger-500/30'
      }`}>
        {plan.safe_to_drink ? '✓ SAFE TO DRINK' : '✗ NOT SAFE TO DRINK'}
      </div>

      {plan.boil_water_advisory && (
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4 text-center">
          <p className="text-amber-400 font-semibold">⚠ BOIL WATER ADVISORY IN EFFECT</p>
          <p className="text-xs text-muted mt-1">Boil all water for at least 1 minute before drinking</p>
        </div>
      )}

      {/* Summary */}
      <div className="bg-navy-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <StatusBadge status={plan.urgency} size="md" />
          <span className="text-xs text-muted">Generated {new Date(plan.generated_at).toLocaleDateString()}</span>
        </div>
        <p className="text-[18px] leading-relaxed text-white">{plan.summary}</p>
      </div>

      {/* Immediate actions */}
      {plan.immediate_actions && plan.immediate_actions.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted mb-2">Immediate Actions</p>
          <ol className="space-y-2">
            {plan.immediate_actions.map((action, i) => (
              <li key={i} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={`action-${i}`}
                  checked={checked[`action-${i}`] ?? false}
                  onChange={() => setChecked((c) => ({ ...c, [`action-${i}`]: !c[`action-${i}`] }))}
                  className="mt-0.5 accent-teal-500"
                />
                <label htmlFor={`action-${i}`} className={`text-sm flex-1 ${checked[`action-${i}`] ? 'line-through text-muted' : 'text-white'}`}>
                  <span className="text-teal-400 font-mono mr-2">{i + 1}.</span>{action}
                </label>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Treatment steps */}
      {plan.treatment_steps && plan.treatment_steps.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted mb-2">Treatment Steps</p>
          <div className="space-y-2">
            {plan.treatment_steps.map((step) => (
              <StepAccordion key={step.step} step={step} />
            ))}
          </div>
        </div>
      )}

      {/* Prevention tips */}
      {plan.prevention_tips && plan.prevention_tips.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted mb-2">Prevention Tips</p>
          <ul className="space-y-1.5">
            {plan.prevention_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white">
                <span className="text-teal-400 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dates and cost */}
      <div className="grid grid-cols-3 gap-3">
        {plan.next_test_date && (
          <div className="bg-navy-700 rounded-lg p-3 text-center">
            <p className="text-xs text-muted">Next Test</p>
            <p className="text-sm font-data text-teal-400 mt-1">{new Date(plan.next_test_date).toLocaleDateString()}</p>
          </div>
        )}
        {plan.next_service_date && (
          <div className="bg-navy-700 rounded-lg p-3 text-center">
            <p className="text-xs text-muted">Next Service</p>
            <p className="text-sm font-data text-amber-400 mt-1">{new Date(plan.next_service_date).toLocaleDateString()}</p>
          </div>
        )}
        {plan.estimated_cost_usd != null && (
          <div className="bg-navy-700 rounded-lg p-3 text-center">
            <p className="text-xs text-muted">Est. Cost</p>
            <p className="text-sm font-data text-white mt-1">${plan.estimated_cost_usd}</p>
            <p className="text-xs text-muted">{currency.code} {totalLocal.toFixed(0)}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 py-2 bg-navy-700 text-muted hover:text-white rounded-lg text-sm transition-colors">
          <Printer className="w-4 h-4" /> Print
        </button>
        <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 py-2 bg-navy-700 text-muted hover:text-white rounded-lg text-sm transition-colors">
          <Share2 className="w-4 h-4" /> Share
        </button>
        <button onClick={generatePlan} className="flex-1 py-2 bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 rounded-lg text-sm transition-colors">
          Regenerate
        </button>
      </div>
    </div>
  )
}
