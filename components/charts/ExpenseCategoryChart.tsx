'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { motion } from 'framer-motion'
import type { CategoryData } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface ExpenseCategoryChartProps {
  data: CategoryData[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-3 border border-border/60"
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
        <span className="text-xs font-semibold text-foreground">{entry.name}</span>
      </div>
      <p className="text-xs text-muted-foreground">{formatCurrency(entry.amount)}</p>
      <p className="text-xs font-bold" style={{ color: entry.color }}>{entry.value}%</p>
    </motion.div>
  )
}

export function ExpenseCategoryChart({ data }: ExpenseCategoryChartProps) {
  const total = data.reduce((sum, d) => sum + d.amount, 0)

  return (
    <div className="glass-card p-6 h-full">
      <div className="mb-5">
        <h3 className="text-base font-bold text-foreground">Categoria Top</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Distribuição de receitas</p>
      </div>

      {/* Donut chart */}
      <div className="relative flex justify-center">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-lg font-bold text-foreground">{formatCurrency(total)}</p>
          <p className="text-[11px] text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2.5">
        {data.map((entry, index) => (
          <motion.div
            key={entry.name}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
              <span className="text-xs font-medium text-foreground">{entry.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{formatCurrency(entry.amount)}</span>
              <span
                className="text-xs font-bold min-w-[36px] text-right"
                style={{ color: entry.color }}
              >
                {entry.value}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
