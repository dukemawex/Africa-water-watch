import { useEffect, useState } from 'react'
import { useWaterStore } from '../store/useWaterStore'
import { waterPointsApi } from '../api/waterPoints'
import { WaterMap } from '../components/Map/WaterMap'
import { AIInsightChat } from '../components/AI/AIInsightChat'

export default function MapPage() {
  const { waterPoints, selectedPointId, setWaterPoints, setSelectedPoint } = useWaterStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (waterPoints.length > 0) return
    setLoading(true)
    waterPointsApi.list().then((pts) => {
      setWaterPoints(pts)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const selectedPoint = waterPoints.find((p) => p.id === selectedPointId) ?? null

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted text-sm">Loading water points…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen relative">
      <WaterMap
        points={waterPoints}
        selectedId={selectedPointId}
        onSelect={setSelectedPoint}
      />
      <AIInsightChat waterPoint={selectedPoint} />
    </div>
  )
}
