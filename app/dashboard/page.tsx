'use client'

export const dynamic = 'force-dynamic'

import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Zap,
  X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'

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
import { usePlan } from '@/hooks/usePlan'
import { formatCurrency } from '@/lib/utils'

const MONTHLY_PLANS = ['basic', 'pro', 'premium']
const ANNUAL_BANNER_KEY = 'annual_banner_dismissed'

export default function DashboardPage() {
  const { metrics, transactions, chartData, categoryData, isLoading } = useDashboard()
  const { plan } = usePlan()
  const [bannerVisible, setBannerVisible] = useState(false)
  const [dasDefaultValue, setDasDefaultValue] = useState(70.6)

  useEffect(() => {
    fetch('/api/das/settings').then(r => r.json()).then(d => {
      if (d.das_default_value) setDasDefaultValue(parseFloat(d.das_default_value))
    })
    setBannerVisible(!localStorage.getItem(ANNUAL_BANNER_KEY))
  }, [])

  const showAnnualBanner = bannerVisible && MONTHLY_PLANS.includes(plan)

  const dismissBanner = () => {
    localStorage.setItem(ANNUAL_BANNER_KEY, '1')
    setBannerVisible(false)
  }

  const activeMonths = chartData.filter(d => d.receita > 0).length || 1
  const bestMonthRevenue = Math.max(...chartData.map(d => d.receita), 0)
  const avgMonthlyRevenue = (metrics?.annualRevenue ?? 0) / activeMonths
  const profitMargin = metrics?.monthRevenue && metrics.monthRevenue > 0
    ? Math.round((metrics.netProfit / metrics.monthRevenue) * 100)
    : 0

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Banner Promoção Anual ────────────────────────────────── */}
        {showAnnualBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-2xl px-5 py-4 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1e0840 0%, #0d1b3e 100%)', border: '1px solid #7C3AED40' }}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #7C3AED 0%, transparent 55%), radial-gradient(circle at 85% 30%, #06B6D4 0%, transparent 40%)' }} />
            <div className="relative flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                <Zap size={18} className="text-violet-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">💰 Economize 20% no plano anual</p>
                <p className="text-xs text-violet-200/80 mt-0.5">Pague uma vez, fique tranquilo o ano inteiro.</p>
              </div>
            </div>
            <div className="relative flex items-center gap-2 self-end sm:self-auto shrink-0">
              <Link
                href="/dashboard/assinatura"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}
              >
                Ver oferta <Zap size={11} />
              </Link>
              <button
                onClick={dismissBanner}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-violet-300/60 hover:text-violet-200 hover:bg-white/10 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}

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
              value={metrics?.dasValue ?? dasDefaultValue}
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
                { label: 'Meses com Receita', value: `${activeMonths}`, delta: `de 12 no ano`, color: '#10B981' },
                { label: 'Melhor Mês', value: formatCurrency(bestMonthRevenue), delta: 'maior faturamento', color: '#06B6D4' },
                { label: 'Média Mensal', value: formatCurrency(avgMonthlyRevenue), delta: 'receita média', color: '#7C3AED' },
                { label: 'Margem de Lucro', value: `${profitMargin}%`, delta: 'este mês', color: '#F59E0B' },
              ].map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.08 }}
                  className="p-4 rounded-xl"
                  style={{ background: `color-mix(in srgb, ${kpi.color} 8%, transparent)` }}
                >
                  <p className="text-xs text-muted-foreground mb-2 truncate">{kpi.label}</p>
                  <p className="text-base font-bold text-foreground truncate">{kpi.value}</p>
                  <p className="text-xs font-semibold mt-1 truncate" style={{ color: kpi.color }}>{kpi.delta}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

      </div>
    </DashboardLayout>
  )
}
