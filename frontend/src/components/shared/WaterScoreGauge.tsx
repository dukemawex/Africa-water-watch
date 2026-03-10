interface WaterScoreGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

function getColor(score: number) {
  if (score >= 70) return '#00B4A6'
  if (score >= 40) return '#F5A623'
  return '#E8455A'
}

const SIZES = {
  sm: { r: 24, cx: 28, cy: 28, sw: 4, viewBox: '0 0 56 56', fontSize: '10px' },
  md: { r: 36, cx: 42, cy: 42, sw: 6, viewBox: '0 0 84 84', fontSize: '14px' },
  lg: { r: 48, cx: 56, cy: 56, sw: 8, viewBox: '0 0 112 112', fontSize: '18px' },
}

export function WaterScoreGauge({ score, size = 'md', showLabel = true }: WaterScoreGaugeProps) {
  const { r, cx, cy, sw, viewBox, fontSize } = SIZES[size]
  const circumference = 2 * Math.PI * r
  const progress = Math.max(0, Math.min(100, score))
  const dashOffset = circumference - (progress / 100) * circumference
  const color = getColor(score)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg viewBox={viewBox} className={size === 'sm' ? 'w-14 h-14' : size === 'md' ? 'w-20 h-20' : 'w-28 h-28'}>
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#243A5C" strokeWidth={sw} />
        {/* Progress circle */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        {showLabel && (
          <>
            <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontFamily="DM Mono" fontWeight="600" fontSize={fontSize}>
              {Math.round(score)}
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="#8A9BB0" fontSize="8px">
              /100
            </text>
          </>
        )}
      </svg>
    </div>
  )
}
