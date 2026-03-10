import { useState, useEffect } from 'react'
import type { WaterPoint } from '../../types'

interface SentinelLayerProps {
  waterPoint: WaterPoint | null
}

export function SentinelLayer({ waterPoint }: SentinelLayerProps) {
  const [data, setData] = useState<{
    ndwi: number | null
    turbidity_index: number | null
    thumbnail_base64: string
    acquisition_date: string | null
  } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!waterPoint) return
    setLoading(true)
    fetch(`/api/satellite/${waterPoint.id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [waterPoint?.id])

  if (!waterPoint) return null

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
      <h4 className="font-heading font-semibold text-white text-sm mb-3">Sentinel-2 Satellite Data</h4>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 bg-navy-700 rounded animate-pulse" />
          <div className="h-32 bg-navy-700 rounded animate-pulse" />
        </div>
      ) : data ? (
        <div className="space-y-3">
          {data.thumbnail_base64 && (
            <img
              src={`data:image/jpeg;base64,${data.thumbnail_base64}`}
              alt="Satellite thumbnail"
              className="w-full rounded-lg"
            />
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-navy-700 rounded-lg p-2">
              <p className="text-muted">NDWI</p>
              <p className="font-data text-teal-400 font-semibold text-base">
                {data.ndwi != null ? data.ndwi.toFixed(3) : '—'}
              </p>
            </div>
            <div className="bg-navy-700 rounded-lg p-2">
              <p className="text-muted">Turbidity Index</p>
              <p className="font-data text-amber-400 font-semibold text-base">
                {data.turbidity_index != null ? data.turbidity_index.toFixed(3) : '—'}
              </p>
            </div>
          </div>
          {data.acquisition_date && (
            <p className="text-xs text-muted">Acquired: {data.acquisition_date}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted">No satellite data available</p>
      )}
    </div>
  )
}
