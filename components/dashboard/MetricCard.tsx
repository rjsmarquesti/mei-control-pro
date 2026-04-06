'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { SkeletonMetricCard } from '@/components/ui/SkeletonCard'

interface MetricCardProps {
  title: string
  value: number
  growth?: number
  icon: LucideIcon
  iconColor: string
  iconBg: string
  prefix?: string
  suffix?: string
  isLoading?: boolean
  description?: string
  index?: number
}

export function MetricCard({
  title,
  value,
  growth,
  icon: Icon,
  iconColor,
  iconBg,
  isLoading,
  description,
  index = 0,
}: MetricCardProps) {
  if (isLoading) return <SkeletonMetricCard />

  const isPositive = (growth ?? 0) >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="glass-card p-5 cursor-default"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ background: iconBg }}
        >
          <Icon size={20} style={{ color: iconColor }} />
        </div>

        {growth !== undefined && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
              isPositive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            }`}
          >
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositive ? '+' : ''}{growth}%
          </div>
        )}
      </div>

      <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-bold text-foreground tracking-tight">
        {formatCurrency(value)}
      </p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
      )}
    </motion.div>
  )
}
