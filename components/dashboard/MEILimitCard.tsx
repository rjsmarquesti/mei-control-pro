'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { Skeleton } from '@/components/ui/SkeletonCard'

interface MEILimitCardProps {
  used: number
  limit: number
  isLoading?: boolean
}

export function MEILimitCard({ used, limit, isLoading }: MEILimitCardProps) {
  const { brandSettings } = useAppStore()
  const percentage = Math.min((used / limit) * 100, 100)
  const isWarning = percentage >= 80
  const isCritical = percentage >= 95

  const radius = 52
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const color = isCritical ? '#EF4444' : isWarning ? '#F59E0B' : brandSettings.primaryColor

  if (isLoading) {
    return (
      <div className="glass-card p-5 space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-28 w-28 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-foreground">Limite MEI</p>
        {isWarning ? (
          <div className={`flex items-center gap-1 text-xs font-semibold ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
            <AlertTriangle size={13} />
            {isCritical ? 'Crítico' : 'Atenção'}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <CheckCircle2 size={13} />
            Normal
          </div>
        )}
      </div>

      <div className="flex items-center gap-5">
        {/* Circular progress */}
        <div className="relative shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
            {/* Background */}
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="8"
            />
            {/* Progress */}
            <motion.circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xl font-bold"
              style={{ color }}
            >
              {percentage.toFixed(0)}%
            </motion.span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Faturado</p>
            <p className="text-base font-bold text-foreground">{formatCurrency(used)}</p>
          </div>
          <div className="h-px bg-border/60" />
          <div>
            <p className="text-xs text-muted-foreground">Limite anual</p>
            <p className="text-sm font-semibold text-muted-foreground">{formatCurrency(limit)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Disponível</p>
            <p className="text-sm font-semibold text-emerald-400">{formatCurrency(limit - used)}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>0</span>
          <span>{formatCurrency(limit)}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  )
}
