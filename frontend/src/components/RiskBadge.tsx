import { CircleCheck, OctagonX, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { RiskLevel } from '@/api/types'
import { RISK_LEVELS } from '@/lib/dictionaries'
import { cn } from '@/lib/utils'

/** Риск никогда не передаётся только цветом: у каждого уровня своя иконка и подпись */
export const RISK_ICONS: Record<RiskLevel, LucideIcon> = {
  low: CircleCheck,
  medium: TriangleAlert,
  high: OctagonX,
}

const soft: Record<RiskLevel, string> = {
  low: 'bg-risk-low-soft text-risk-low',
  medium: 'bg-risk-medium-soft text-risk-medium',
  high: 'bg-risk-high-soft text-risk-high',
}

const solid: Record<RiskLevel, string> = {
  low: 'bg-risk-low-solid',
  medium: 'bg-risk-medium-solid',
  high: 'bg-risk-high-solid',
}

export function RiskBadge({
  level,
  short = false,
  className,
}: {
  level: RiskLevel
  short?: boolean
  className?: string
}) {
  const Icon = RISK_ICONS[level]
  const { label, short: shortLabel } = RISK_LEVELS[level]
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap',
        soft[level],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {short ? shortLabel : label}
    </span>
  )
}

/** Светофор: три лампы, активна та, что соответствует общему уровню риска */
export function TrafficLight({ level, className }: { level: RiskLevel; className?: string }) {
  const lamps: RiskLevel[] = ['high', 'medium', 'low']
  return (
    <div
      role="img"
      aria-label={`Светофор: ${RISK_LEVELS[level].label.toLowerCase()}`}
      className={cn('flex flex-col gap-1.5 rounded-2xl bg-slate-900 p-2', className)}
    >
      {lamps.map((l) => (
        <span
          key={l}
          className={cn('size-5 rounded-full', solid[l], l === level ? 'ring-2 ring-white/70' : 'opacity-20')}
        />
      ))}
    </div>
  )
}
