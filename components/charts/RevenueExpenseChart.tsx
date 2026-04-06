'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import type { ChartData } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface RevenueExpenseChartProps {
  data: ChartData[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-4 min-w-[180px] border border-border/60"
    >
      <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-1.5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-xs text-muted-foreground capitalize">{entry.name}</span>
          </div>
          <span className="text-xs font-bold text-foreground">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </motion.div>
  )
}

const CustomLegend = ({ payload }: any) => (
  <div className="flex items-center gap-4 mt-2">
    {payload?.map((entry: any) => (
      <div key={entry.value} className="flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
        <span className="text-xs font-medium text-muted-foreground capitalize">{entry.value}</span>
      </div>
    ))}
  </div>
)

export function RevenueExpenseChart({ data }: RevenueExpenseChartProps) {
  const [activeTab, setActiveTab] = useState<'month' | 'year'>('month')
  const { brandSettings } = useAppStore()

  const chartData = activeTab === 'month' ? data.slice(-6) : data

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground">Receita vs Despesa</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Comparativo do período</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/60">
          {(['month', 'year'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              style={activeTab === tab
                ? { background: brandSettings.primaryColor, color: 'white' }
                : { color: 'hsl(var(--muted-foreground))' }
              }
            >
              {tab === 'month' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={brandSettings.primaryColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={brandSettings.primaryColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          <Area
            type="monotone"
            dataKey="receita"
            stroke="#10B981"
            strokeWidth={2.5}
            fill="url(#colorReceita)"
            dot={false}
            activeDot={{ r: 5, fill: '#10B981', strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="despesa"
            stroke="#EF4444"
            strokeWidth={2.5}
            fill="url(#colorDespesa)"
            dot={false}
            activeDot={{ r: 5, fill: '#EF4444', strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="lucro"
            stroke={brandSettings.primaryColor}
            strokeWidth={2}
            fill="url(#colorLucro)"
            dot={false}
            strokeDasharray="5 3"
            activeDot={{ r: 5, fill: brandSettings.primaryColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
