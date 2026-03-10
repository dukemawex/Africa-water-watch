import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, Brush, ResponsiveContainer
} from 'recharts'
import type { Reading } from '../../types'
import { format } from 'date-fns'
import { Download } from 'lucide-react'

interface TrendChartProps {
  readings: Reading[]
  title?: string
}

const PARAMS = [
  { key: 'ph', label: 'pH', color: '#00B4A6', who: { low: 6.5, high: 8.5 } },
  { key: 'tds', label: 'TDS (mg/L)', color: '#F5A623', who: { high: 1000 } },
  { key: 'turbidity', label: 'Turbidity (NTU)', color: '#E8455A', who: { high: 4 } },
  { key: 'nitrate', label: 'Nitrate (mg/L)', color: '#8B5CF6', who: { high: 11.3 } },
]

export function TrendChart({ readings, title = 'Water Quality Trends' }: TrendChartProps) {
  const [visible, setVisible] = useState<Record<string, boolean>>({
    ph: true, tds: true, turbidity: true, nitrate: true,
  })

  const chartData = [...readings]
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map((r) => ({
      date: format(new Date(r.recorded_at), 'MMM dd'),
      ph: r.ph,
      tds: r.tds,
      turbidity: r.turbidity,
      nitrate: r.nitrate,
    }))

  function exportPNG() {
    const svg = document.querySelector('.recharts-surface') as SVGElement
    if (!svg) return
    const canvas = document.createElement('canvas')
    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d')?.drawImage(img, 0, 0)
      const a = document.createElement('a')
      a.download = `${title.replace(/\s+/g, '_')}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`
  }

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-white">{title}</h3>
        <button
          onClick={exportPNG}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-white px-3 py-1.5 rounded-lg border border-navy-700 hover:border-navy-600 transition-colors"
        >
          <Download className="w-3 h-3" />
          Export PNG
        </button>
      </div>

      {/* Toggle buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PARAMS.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setVisible((v) => ({ ...v, [key]: !v[key] }))}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: visible[key] ? `${color}20` : '#1A2E4A',
              color: visible[key] ? color : '#8A9BB0',
              borderWidth: 1,
              borderColor: visible[key] ? color : '#243A5C',
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: visible[key] ? color : '#243A5C' }} />
            {label}
          </button>
        ))}
      </div>

      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted text-sm">No readings available</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#243A5C" />
            <XAxis dataKey="date" tick={{ fill: '#8A9BB0', fontSize: 11 }} axisLine={{ stroke: '#243A5C' }} />
            <YAxis tick={{ fill: '#8A9BB0', fontSize: 11 }} axisLine={{ stroke: '#243A5C' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A2E4A', border: '1px solid #243A5C', borderRadius: 8 }}
              labelStyle={{ color: '#E8F4F3' }}
              itemStyle={{ color: '#8A9BB0' }}
            />
            <Legend wrapperStyle={{ color: '#8A9BB0', fontSize: 12 }} />

            {/* WHO Reference lines */}
            <ReferenceLine y={8.5} stroke="#F5A623" strokeDasharray="4 4" label={{ value: 'pH max', fill: '#F5A623', fontSize: 10 }} />
            <ReferenceLine y={6.5} stroke="#F5A623" strokeDasharray="4 4" />
            <ReferenceLine y={1000} stroke="#F5A623" strokeDasharray="4 4" label={{ value: 'TDS max', fill: '#F5A623', fontSize: 10 }} />

            {PARAMS.map(({ key, color }) =>
              visible[key] ? (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ) : null
            )}
            <Brush dataKey="date" height={20} stroke="#243A5C" fill="#0D1E35" travellerWidth={8} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
