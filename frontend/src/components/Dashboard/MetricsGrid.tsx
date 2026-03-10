import { useEffect, useState } from 'react'
import { Droplets, AlertTriangle, Wrench, TrendingUp, TrendingDown } from 'lucide-react'
import { WaterScoreGauge } from '../shared/WaterScoreGauge'
import { StatusBadge } from '../shared/StatusBadge'
import { useNavigate } from 'react-router-dom'
import type { WaterPoint, MaintenanceQueueItem, Alert } from '../../types'
import { COUNTRY_FLAGS } from '../../types'
import clsx from 'clsx'

interface MetricsGridProps {
  waterPoints: WaterPoint[]
  alerts: Alert[]
  maintenanceQueue: MaintenanceQueueItem[]
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  sub?: string
}) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted">{label}</p>
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="font-data text-3xl font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  )
}

function Sparkline({ data }: { data: number[] }) {
  if (!data.length) return null
  const max = Math.max(...data) || 1
  const min = Math.min(...data)
  const range = max - min || 1
  const height = 28
  const width = 60
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke="#00B4A6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function WaterPointCard({ point }: { point: WaterPoint }) {
  const navigate = useNavigate()
  const flag = COUNTRY_FLAGS[point.country ?? ''] ?? '🌍'
  const daysSinceService = point.last_serviced
    ? Math.round((Date.now() - new Date(point.last_serviced).getTime()) / 86400000)
    : null

  return (
    <div
      onClick={() => navigate(`/water-point/${point.id}`)}
      className="bg-navy-800 border border-navy-700 rounded-xl p-4 cursor-pointer hover:border-teal-500/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm truncate">{point.name}</p>
          <p className="text-xs text-muted mt-0.5">{flag} {point.country} · {point.type}</p>
        </div>
        <WaterScoreGauge score={point.quality_score} size="sm" />
      </div>
      <div className="flex items-center justify-between">
        <StatusBadge status={point.status} size="sm" />
        {daysSinceService !== null && (
          <span className="text-xs text-muted font-data">{daysSinceService}d ago</span>
        )}
      </div>
    </div>
  )
}

export function MetricsGrid({ waterPoints, alerts, maintenanceQueue }: MetricsGridProps) {
  const criticalAlerts = alerts.filter((a) => !a.resolved && a.severity === 'critical').length
  const dueForService = maintenanceQueue.filter((m) => m.urgency_level === 'critical' || m.urgency_level === 'high').length
  const avgScore = waterPoints.length
    ? Math.round(waterPoints.reduce((s, p) => s + p.quality_score, 0) / waterPoints.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Points" value={waterPoints.length} icon={Droplets} color="bg-teal-500/20 text-teal-400" />
        <StatCard label="Critical Alerts" value={criticalAlerts} icon={AlertTriangle} color="bg-danger-500/20 text-danger-500" />
        <StatCard label="Due for Service" value={dueForService} icon={Wrench} color="bg-amber-500/20 text-amber-400" sub="high + critical" />
        <StatCard
          label="Avg Quality Score"
          value={`${avgScore}/100`}
          icon={avgScore >= 70 ? TrendingUp : TrendingDown}
          color={avgScore >= 70 ? 'bg-teal-500/20 text-teal-400' : 'bg-danger-500/20 text-danger-500'}
        />
      </div>

      {/* Water point cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {waterPoints.map((p) => (
          <WaterPointCard key={p.id} point={p} />
        ))}
      </div>
    </div>
  )
}
