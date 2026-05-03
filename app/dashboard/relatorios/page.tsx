'use client'

export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Download, TrendingUp, TrendingDown, Wallet, FileText } from 'lucide-react'
import { PrintButton } from '@/components/ui/PrintButton'
import { PrintSection } from '@/components/ui/PrintSection'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PlanGate } from '@/components/plan/PlanGate'
import { RevenueExpenseChart } from '@/components/charts/RevenueExpenseChart'
import { ExpenseCategoryChart } from '@/components/charts/ExpenseCategoryChart'
import { useDashboard } from '@/hooks/useDashboard'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency } from '@/lib/utils'
import { SkeletonChart } from '@/components/ui/SkeletonCard'
import { supabase } from '@/lib/supabase'

interface Profile { name?: string; email?: string; cnpj?: string; city?: string }

export default function RelatoriosPage() {
  const router = useRouter()
  const { metrics, chartData, categoryData, isLoading } = useDashboard()
  const { brandSettings } = useAppStore()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase.from('profiles').select('name,email,cnpj,city').eq('id', session.user.id).single()
        .then(({ data }) => { if (data) setProfile(data) })
    })
  }, [])

  const topMonths = [...chartData].sort((a, b) => b.lucro - a.lucro).slice(0, 5)

  return (
    <DashboardLayout>
      <PlanGate requiredPlan="pro" featureName="Relatórios">
      <PrintSection id="relatorios-print" title="Relatório Financeiro" profile={profile}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 no-print">
          <div>
            <h2 className="text-xl font-bold text-foreground">Relatórios</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Análise detalhada do seu negócio</p>
          </div>
          <PrintButton />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Melhor mês', value: chartData.length ? Math.max(...chartData.map((d) => d.receita)) : 0, color: '#10B981', icon: TrendingUp },
            { label: 'Maior despesa', value: chartData.length ? Math.max(...chartData.map((d) => d.despesa)) : 0, color: '#EF4444', icon: TrendingDown },
            { label: 'Lucro anual', value: chartData.reduce((s, d) => s + d.lucro, 0), color: '#7C3AED', icon: Wallet },
            { label: 'Média mensal', value: chartData.reduce((s, d) => s + d.receita, 0) / (chartData.length || 1), color: '#06B6D4', icon: BarChart3 },
          ].map(({ label, value, color, icon: Icon }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-base font-bold text-foreground truncate">{formatCurrency(value)}</p>
            </motion.div>
          ))}
        </div>

        {/* Main chart */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            {isLoading ? <SkeletonChart /> : <RevenueExpenseChart data={chartData} />}
          </div>
          <div>{isLoading ? <SkeletonChart /> : <ExpenseCategoryChart data={categoryData} />}</div>
        </div>

        {/* Top months bar chart */}
        {chartData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <h3 className="text-base font-bold text-foreground mb-5">Top 5 Meses mais Lucrativos</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topMonths} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="lucro" fill={brandSettings.primaryColor} radius={[6, 6, 0, 0]} name="Lucro" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Export options */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 no-print">
          <h3 className="text-base font-bold text-foreground mb-4">Exportar Relatórios</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Relatório Mensal', desc: 'Receitas e despesas do mês atual', icon: FileText, action: () => window.print() },
              { label: 'Relatório Anual', desc: 'Consolidado do ano fiscal', icon: BarChart3, action: () => window.print() },
              { label: 'Relatório IRPF', desc: 'Dados para declaração do IR', icon: FileText, action: () => router.push('/dashboard/irpf') },
            ].map(({ label, desc, icon: Icon, action }) => (
              <button key={label} onClick={action} className="flex items-start gap-3 p-4 rounded-xl border border-border/60 hover:bg-muted/50 transition-colors text-left group">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `color-mix(in srgb, ${brandSettings.primaryColor} 15%, transparent)` }}>
                  <Icon size={16} style={{ color: brandSettings.primaryColor }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <Download size={14} className="ml-auto shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
      </PrintSection>
    </PlanGate>
    </DashboardLayout>
  )
}
