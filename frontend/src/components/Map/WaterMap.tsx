import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import type { WaterPoint } from '../../types'
import { WaterScoreGauge } from '../shared/WaterScoreGauge'
import { StatusBadge } from '../shared/StatusBadge'
import { useNavigate } from 'react-router-dom'

interface WaterMapProps {
  points: WaterPoint[]
  selectedId?: string | null
  onSelect?: (id: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  safe: '#00B4A6',
  warning: '#F5A623',
  danger: '#E8455A',
}

function populationToRadius(pop: number) {
  if (pop > 100000) return 20
  if (pop > 10000) return 14
  if (pop > 1000) return 10
  return 7
}

function FlyToPoint({ point }: { point: WaterPoint | null }) {
  const map = useMap()
  useEffect(() => {
    if (point) map.flyTo([point.latitude, point.longitude], 12, { duration: 1.2 })
  }, [point, map])
  return null
}

function SlidePanelPoint({ point, onClose }: { point: WaterPoint; onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="absolute top-4 right-4 z-[1000] w-72 bg-navy-800 border border-navy-700 rounded-xl shadow-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-heading font-bold text-white text-sm leading-tight">{point.name}</h3>
          <p className="text-xs text-muted mt-0.5">{point.country} · {point.type}</p>
        </div>
        <button onClick={onClose} className="text-muted hover:text-white ml-2 text-lg leading-none">×</button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <WaterScoreGauge score={point.quality_score} size="sm" />
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted">Status</span>
            <StatusBadge status={point.status} size="sm" />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted">Population</span>
            <span className="font-data text-white">{point.population.toLocaleString()}</span>
          </div>
          {point.last_serviced && (
            <div className="flex justify-between text-xs">
              <span className="text-muted">Last Service</span>
              <span className="font-data text-white">{new Date(point.last_serviced).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/water-point/${point.id}`)}
          className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          View Details
        </button>
        <button
          onClick={() => navigate(`/maintenance?point=${point.id}`)}
          className="flex-1 py-2 bg-navy-700 hover:bg-navy-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Treatment Plan
        </button>
      </div>
    </div>
  )
}

export function WaterMap({ points, selectedId, onSelect }: WaterMapProps) {
  const [selected, setSelected] = useState<WaterPoint | null>(null)
  const [filter, setFilter] = useState<{ country: string; type: string; status: string }>({
    country: '', type: '', status: '',
  })

  const selectedPoint = selectedId ? points.find((p) => p.id === selectedId) ?? null : null

  const filtered = points.filter((p) => {
    if (filter.country && p.country !== filter.country) return false
    if (filter.type && p.type !== filter.type) return false
    if (filter.status && p.status !== filter.status) return false
    return true
  })

  const countries = [...new Set(points.map((p) => p.country).filter(Boolean))]
  const types = [...new Set(points.map((p) => p.type))]

  return (
    <div className="relative h-full w-full">
      {/* Filter bar */}
      <div className="absolute top-4 left-4 z-[1000] flex gap-2 flex-wrap">
        <select
          value={filter.country}
          onChange={(e) => setFilter((f) => ({ ...f, country: e.target.value }))}
          className="bg-navy-800 border border-navy-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-teal-500"
        >
          <option value="">All Countries</option>
          {countries.map((c) => <option key={c} value={c!}>{c}</option>)}
        </select>
        <select
          value={filter.type}
          onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
          className="bg-navy-800 border border-navy-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-teal-500"
        >
          <option value="">All Types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          className="bg-navy-800 border border-navy-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-teal-500"
        >
          <option value="">All Status</option>
          <option value="safe">Safe</option>
          <option value="warning">Warning</option>
          <option value="danger">Danger</option>
        </select>
      </div>

      <MapContainer
        center={[6.0, 20.0]}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <FlyToPoint point={selectedPoint} />
        {filtered.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.latitude, point.longitude]}
            radius={populationToRadius(point.population)}
            pathOptions={{
              fillColor: STATUS_COLORS[point.status] ?? '#8A9BB0',
              fillOpacity: 0.85,
              color: point.id === selected?.id ? '#fff' : STATUS_COLORS[point.status] ?? '#8A9BB0',
              weight: point.id === selected?.id ? 2 : 1,
            }}
            eventHandlers={{
              click: () => {
                setSelected(point)
                onSelect?.(point.id)
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
              <div className="text-navy-950 text-xs font-medium">
                <div>{point.name}</div>
                <div>Score: {Math.round(point.quality_score)}/100</div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {selected && (
        <SlidePanelPoint point={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
