import clsx from 'clsx'
import type { WaterStatus, UrgencyLevel, AlertSeverity } from '../../types'

interface StatusBadgeProps {
  status: WaterStatus | UrgencyLevel | AlertSeverity | string
  pulse?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const STATUS_STYLES: Record<string, string> = {
  safe: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  danger: 'bg-danger-500/20 text-danger-500 border border-danger-500/30',
  critical: 'bg-danger-500/20 text-danger-500 border border-danger-500/30',
  high: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  scheduled: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  in_progress: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  completed: 'bg-green-500/20 text-green-400 border border-green-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
}

const SIZE_STYLES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export function StatusBadge({ status, pulse = false, size = 'md' }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium uppercase tracking-wide',
        style,
        SIZE_STYLES[size],
        pulse && (status === 'critical' || status === 'danger') && 'animate-status-pulse'
      )}
    >
      <span
        className={clsx(
          'h-1.5 w-1.5 rounded-full',
          status === 'safe' || status === 'completed' ? 'bg-teal-400' :
          status === 'warning' || status === 'medium' ? 'bg-amber-400' :
          status === 'critical' || status === 'danger' ? 'bg-danger-500' :
          status === 'high' ? 'bg-orange-400' :
          'bg-blue-400'
        )}
      />
      {status.replace('_', ' ')}
    </span>
  )
}
