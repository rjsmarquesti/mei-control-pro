'use client'

export const dynamic = 'force-dynamic'

import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PlanGate } from '@/components/plan/PlanGate'
import { RevenueExpenseChart } from '@/components/charts/RevenueExpenseChart'
import { ExpenseCategoryChart } from '@/components/charts/ExpenseCategoryChart'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { useDashboard } from '@/hooks/useDashboard'
import { formatCurrency } from '@/lib/utils'
import { SkeletonChart } from '@/components/ui/SkeletonCard'

export default function FinanceiroPage() {
  const { metrics, chartData, categoryData, isLoading } = useDashboard()

  const cashFlow = [
    { label: 'Entradas', value: metrics?.monthRevenue ?? 0, color: '#10B981', icon: TrendingUp },
    { label: 'Saídas', value: metrics?.monthExpenses ?? 0, color: '#EF4444', icon: TrendingDown },
    { label: 'Saldo', value: metrics?.netProfit ?? 0, color: '#7C3AED', icon: Wallet },
  ]

  return (
    <DashboardLayout>
      <PlanGate requiredPlan="basic" featureName="Financeiro">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Financeiro</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Visão completa da sua saúde financeira</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Faturamento do Mês" value={metrics?.monthRevenue ?? 0} growth={metrics?.monthRevenueGrowth} icon={TrendingUp} iconColor="#10B981" iconBg="rgba(16,185,129,0.12)" isLoading={isLoading} index={0} />
          <MetricCard title="Faturamento Anual" value={metrics?.annualRevenue ?? 0} icon={DollarSign} iconColor="#06B6D4" iconBg="rgba(6,182,212,0.12)" isLoading={isLoading} index={1} />
          <MetricCard title="Despesas do Mês" value={metrics?.monthExpenses ?? 0} growth={metrics?.monthExpensesGrowth} icon={TrendingDown} iconColor="#EF4444" iconBg="rgba(239,68,68,0.12)" isLoading={isLoading} index={2} />
          <MetricCard title="Lucro Líquido" value={metrics?.netProfit ?? 0} growth={metrics?.netProfitGrowth} icon={Wallet} iconColor="#7C3AED" iconBg="rgba(124,58,237,0.12)" isLoading={isLoading} index={3} />
        </div>

        {/* Cash flow cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cashFlow.map(({ label, value, color, icon: Icon }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color }}>{formatCurrency(value)}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            {isLoading ? <SkeletonChart /> : <RevenueExpenseChart data={chartData} />}
          </div>
          <div>
            {isLoading ? <SkeletonChart /> : <ExpenseCategoryChart data={categoryData} />}
          </div>
        </div>

        {/* MEI limit bar */}
        {metrics && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Limite MEI Anual</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Controle seu faturamento para não ultrapassar o limite</p>
              </div>
              <span className="text-sm font-bold text-violet-400">
                {((metrics.meiUsed / metrics.meiLimit) * 100).toFixed(1)}% usado
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden mb-3">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #7C3AED, #06B6D4)' }}
                initial={{ width: 0 }}
                animate={{ width: `${(metrics.meiUsed / metrics.meiLimit) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Faturado: <strong className="text-foreground">{formatCurrency(metrics.meiUsed)}</strong></span>
              <span className="text-muted-foreground">Disponível: <strong className="text-emerald-400">{formatCurrency(metrics.meiLimit - metrics.meiUsed)}</strong></span>
              <span className="text-muted-foreground">Limite: <strong className="text-foreground">{formatCurrency(metrics.meiLimit)}</strong></span>
            </div>
          </motion.div>
        )}
      </div>
    </PlanGate>
    </DashboardLayout>
  )
}
