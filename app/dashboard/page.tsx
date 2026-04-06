'use client'

import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
} from 'lucide-react'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { MEILimitCard } from '@/components/dashboard/MEILimitCard'
import { DASCard } from '@/components/dashboard/DASCard'
import { RevenueExpenseChart } from '@/components/charts/RevenueExpenseChart'
import { ExpenseCategoryChart } from '@/components/charts/ExpenseCategoryChart'
import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { BrandCustomizer } from '@/components/dashboard/BrandCustomizer'
import { SkeletonChart } from '@/components/ui/SkeletonCard'
import { useDashboard } from '@/hooks/useDashboard'

export default function DashboardPage() {
  const { metrics, transactions, chartData, categoryData, isLoading } = useDashboard()

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Row 1: Metric Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title="Faturamento do Mês"
            value={metrics?.monthRevenue ?? 0}
            growth={metrics?.monthRevenueGrowth}
            icon={TrendingUp}
            iconColor="#10B981"
            iconBg="rgba(16, 185, 129, 0.12)"
            description="vs. mês anterior"
            isLoading={isLoading}
            index={0}
          />
          <MetricCard
            title="Faturamento Anual"
            value={metrics?.annualRevenue ?? 0}
            icon={DollarSign}
            iconColor="#06B6D4"
            iconBg="rgba(6, 182, 212, 0.12)"
            description={`${metrics ? ((metrics.annualRevenue / metrics.meiLimit) * 100).toFixed(0) : 0}% do limite MEI`}
            isLoading={isLoading}
            index={1}
          />
          <MetricCard
            title="Despesas do Mês"
            value={metrics?.monthExpenses ?? 0}
            growth={metrics?.monthExpensesGrowth}
            icon={TrendingDown}
            iconColor="#EF4444"
            iconBg="rgba(239, 68, 68, 0.12)"
            description="vs. mês anterior"
            isLoading={isLoading}
            index={2}
          />
          <MetricCard
            title="Lucro Líquido"
            value={metrics?.netProfit ?? 0}
            growth={metrics?.netProfitGrowth}
            icon={Wallet}
            iconColor="#7C3AED"
            iconBg="rgba(124, 58, 237, 0.12)"
            description="lucratividade"
            isLoading={isLoading}
            index={3}
          />
        </div>

        {/* ── Row 2: Quick Actions ────────────────────────────────── */}
        <QuickActions />

        {/* ── Row 3: Chart + Right Column ─────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Big chart */}
          <div className="xl:col-span-2">
            {isLoading ? (
              <SkeletonChart />
            ) : (
              <RevenueExpenseChart data={chartData} />
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <MEILimitCard
              used={metrics?.meiUsed ?? 0}
              limit={metrics?.meiLimit ?? 81000}
              isLoading={isLoading}
            />
            <DASCard
              value={metrics?.dasValue ?? 70.6}
              dueDate={metrics?.dasDueDate ?? '2025-04-20'}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* ── Row 4: Transactions + Category Chart ───────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <TransactionsTable transactions={transactions} isLoading={isLoading} />
          </div>
          <div>
            {isLoading ? (
              <SkeletonChart />
            ) : (
              <ExpenseCategoryChart data={categoryData} />
            )}
          </div>
        </div>

        {/* ── Row 5: Brand Customizer ─────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-start-3">
            <BrandCustomizer />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="xl:col-span-2 glass-card p-6"
          >
            <h3 className="text-base font-bold text-foreground mb-1">Visão Geral do Negócio</h3>
            <p className="text-xs text-muted-foreground mb-5">Resumo dos indicadores principais</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Clientes Ativos', value: '12', delta: '+2', color: '#10B981' },
                { label: 'Projetos em Curso', value: '3', delta: '0', color: '#06B6D4' },
                { label: 'Ticket Médio', value: 'R$ 683', delta: '+8%', color: '#7C3AED' },
                { label: 'Taxa de Lucro', value: '74%', delta: '+6pp', color: '#F59E0B' },
              ].map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.08 }}
                  className="p-4 rounded-xl"
                  style={{ background: `color-mix(in srgb, ${kpi.color} 8%, transparent)` }}
                >
                  <p className="text-xs text-muted-foreground mb-2">{kpi.label}</p>
                  <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: kpi.color }}>{kpi.delta} este mês</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

      </div>
    </DashboardLayout>
  )
}
