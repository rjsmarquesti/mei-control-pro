'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart as LineChartIcon, TrendingUp, TrendingDown, Wallet, AlertCircle,
  ArrowUpRight, ArrowDownLeft, Target, Calendar, BarChart3,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PlanGate } from '@/components/plan/PlanGate'
import { PrintButton } from '@/components/ui/PrintButton'
import { PrintSection } from '@/components/ui/PrintSection'
import { useDashboard } from '@/hooks/useDashboard'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface Transaction { id: string; type: 'revenue' | 'expense'; amount: number; category: string; description: string; date: string }
interface Profile { name?: string; email?: string; cnpj?: string; city?: string }

const MEI_LIMIT = 81000

export default function RelatoriosAvancadosPage() {
  const { metrics, chartData, isLoading } = useDashboard()
  const { brandSettings } = useAppStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadingTx, setLoadingTx] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const year = new Date().getFullYear()
      const [{ data: tx }, { data: prof }] = await Promise.all([
        supabase.from('transactions').select('id,type,amount,category,description,date')
          .eq('user_id', session.user.id)
          .gte('date', `${year}-01-01`)
          .lte('date', `${year}-12-31`)
          .order('date', { ascending: false }),
        supabase.from('profiles').select('name,email,cnpj,city').eq('id', session.user.id).single(),
      ])
      if (tx) setTransactions(tx as Transaction[])
      if (prof) setProfile(prof)
      setLoadingTx(false)
    }
    load()
  }, [])

  // KPIs
  const annualRevenue = chartData.reduce((s, d) => s + d.receita, 0)
  const annualExpenses = chartData.reduce((s, d) => s + d.despesa, 0)
  const annualProfit = annualRevenue - annualExpenses
  const profitMargin = annualRevenue > 0 ? (annualProfit / annualRevenue) * 100 : 0
  const meiUsagePct = annualRevenue > 0 ? (annualRevenue / MEI_LIMIT) * 100 : 0
  const avgMonthly = chartData.length > 0 ? annualRevenue / chartData.length : 0
  const revenueCount = transactions.filter(t => t.type === 'revenue').length
  const avgTicket = revenueCount > 0 ? annualRevenue / revenueCount : 0

  // Accumulated cash flow
  const cumulativeData = chartData.reduce<{ month: string; acumulado: number }[]>((acc, d, i) => {
    const prev = i > 0 ? acc[i - 1].acumulado : 0
    acc.push({ month: d.month, acumulado: prev + d.lucro })
    return acc
  }, [])

  // Period comparison (last 2 available months)
  const lastTwo = chartData.slice(-2)
  const curr = lastTwo[1] ?? { receita: 0, despesa: 0, lucro: 0, month: '-' }
  const prev = lastTwo[0] ?? { receita: 0, despesa: 0, lucro: 0, month: '-' }
  const pctChange = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : 0)

  // Category analysis
  const categoryMap: Record<string, { revenue: number; expense: number; count: number }> = {}
  for (const t of transactions) {
    if (!categoryMap[t.category]) categoryMap[t.category] = { revenue: 0, expense: 0, count: 0 }
    if (t.type === 'revenue') categoryMap[t.category].revenue += t.amount
    else categoryMap[t.category].expense += t.amount
    categoryMap[t.category].count++
  }
  const categoryRows = Object.entries(categoryMap)
    .map(([cat, v]) => ({ cat, ...v, total: v.revenue + v.expense, avg: (v.revenue + v.expense) / v.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // Top transactions
  const topRevenue = [...transactions].filter(t => t.type === 'revenue').sort((a, b) => b.amount - a.amount).slice(0, 5)
  const topExpense = [...transactions].filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5)

  // Projection: avg of last 3 months
  const last3 = chartData.slice(-3)
  const avgLast3 = last3.length > 0 ? last3.reduce((s, d) => s + d.receita, 0) / last3.length : 0
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const nextMonthIdx = new Date().getMonth() + 1
  const projectionData = [0, 1, 2].map(i => ({
    month: months[(nextMonthIdx + i) % 12],
    projecao: avgLast3,
  }))

  // Alerts
  const monthsWithNoTx = chartData.filter(d => d.receita === 0).length
  const hasOverdueDAS = false // could be extended

  const kpis = [
    { label: 'Margem de Lucro', value: `${profitMargin.toFixed(1)}%`, sub: profitMargin >= 30 ? 'Saudável' : 'Atenção', color: profitMargin >= 30 ? '#10B981' : '#F59E0B', icon: TrendingUp },
    { label: 'Ticket Médio', value: formatCurrency(avgTicket), sub: `${revenueCount} receitas`, color: '#06B6D4', icon: Wallet },
    { label: 'Uso Limite MEI', value: `${meiUsagePct.toFixed(1)}%`, sub: meiUsagePct > 90 ? 'Crítico!' : meiUsagePct > 70 ? 'Atenção' : 'Normal', color: meiUsagePct > 90 ? '#EF4444' : meiUsagePct > 70 ? '#F59E0B' : '#10B981', icon: Target },
    { label: 'Média Mensal', value: formatCurrency(avgMonthly), sub: `${chartData.length} meses`, color: '#7C3AED', icon: BarChart3 },
  ]

  return (
    <DashboardLayout>
      <PlanGate requiredPlan="pro" featureName="Relatórios Avançados">
        <PrintSection id="relatorios-avancados-print" title="Relatório Avançado" profile={profile}>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3 no-print">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  Relatórios Avançados
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-violet-500/20 text-violet-400">PRO</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">Análise aprofundada da saúde financeira</p>
              </div>
              <PrintButton label="Exportar PDF" />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {kpis.map(({ label, value, sub, color, icon: Icon }, i) => (
                <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                      <Icon size={14} style={{ color }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{value}</p>
                  <p className="text-xs mt-0.5" style={{ color }}>{sub}</p>
                </motion.div>
              ))}
            </div>

            {/* Fluxo Acumulado */}
            {cumulativeData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <h3 className="text-base font-bold text-foreground mb-5">Fluxo de Caixa Acumulado</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={cumulativeData} margin={{ left: -20 }}>
                    <defs>
                      <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={brandSettings.primaryColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={brandSettings.primaryColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="acumulado" stroke={brandSettings.primaryColor} strokeWidth={2} fill="url(#gradAcum)" name="Acumulado" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Comparativo de Períodos */}
            {lastTwo.length === 2 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <h3 className="text-base font-bold text-foreground mb-5">Comparativo de Períodos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Receita', curr: curr.receita, prev: prev.receita, color: '#10B981' },
                    { label: 'Despesa', curr: curr.despesa, prev: prev.despesa, color: '#EF4444' },
                    { label: 'Lucro', curr: curr.lucro, prev: prev.lucro, color: brandSettings.primaryColor },
                  ].map(({ label, curr: c, prev: p, color }) => {
                    const pct = pctChange(c, p)
                    const up = pct >= 0
                    return (
                      <div key={label} className="rounded-xl border border-border/50 p-4">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(c)}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {up ? <ArrowUpRight size={13} className="text-emerald-400" /> : <ArrowDownLeft size={13} className="text-red-400" />}
                          <span className={`text-xs font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>{Math.abs(pct).toFixed(1)}%</span>
                          <span className="text-xs text-muted-foreground">vs {prev.month}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Análise por Categoria */}
            {categoryRows.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <h3 className="text-base font-bold text-foreground mb-5">Análise por Categoria</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border/50">
                        <th className="text-left pb-3 font-medium">Categoria</th>
                        <th className="text-right pb-3 font-medium">Receitas</th>
                        <th className="text-right pb-3 font-medium">Despesas</th>
                        <th className="text-right pb-3 font-medium">Lançamentos</th>
                        <th className="text-right pb-3 font-medium">Ticket Médio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {categoryRows.map(({ cat, revenue, expense, count, avg }) => (
                        <tr key={cat}>
                          <td className="py-3 font-medium text-foreground">{cat}</td>
                          <td className="py-3 text-right text-emerald-400">{revenue > 0 ? formatCurrency(revenue) : '—'}</td>
                          <td className="py-3 text-right text-red-400">{expense > 0 ? formatCurrency(expense) : '—'}</td>
                          <td className="py-3 text-right text-muted-foreground">{count}</td>
                          <td className="py-3 text-right text-foreground">{formatCurrency(avg)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Ranking */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {[
                { title: 'Top 5 Receitas', items: topRevenue, color: '#10B981', Icon: TrendingUp },
                { title: 'Top 5 Despesas', items: topExpense, color: '#EF4444', Icon: TrendingDown },
              ].map(({ title, items, color, Icon }) => (
                <motion.div key={title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon size={16} style={{ color }} />
                    <h3 className="text-base font-bold text-foreground">{title}</h3>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado</p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((t, i) => (
                        <div key={t.id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{t.description || t.category}</p>
                            <p className="text-xs text-muted-foreground">{t.category} · {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                          </div>
                          <span className="text-sm font-bold shrink-0" style={{ color }}>{formatCurrency(t.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Projeção */}
            {avgLast3 > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Calendar size={16} style={{ color: brandSettings.primaryColor }} />
                  <h3 className="text-base font-bold text-foreground">Projeção dos Próximos 3 Meses</h3>
                  <span className="text-xs text-muted-foreground">(baseado na média dos últimos 3 meses)</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={projectionData} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                    <Bar dataKey="projecao" radius={[6, 6, 0, 0]} name="Projeção" fill={`color-mix(in srgb, ${brandSettings.primaryColor} 60%, transparent)`} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Alertas */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={16} className="text-amber-400" />
                <h3 className="text-base font-bold text-foreground">Alertas & Insights</h3>
              </div>
              <div className="space-y-3">
                {meiUsagePct > 90 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">Você atingiu {meiUsagePct.toFixed(0)}% do limite MEI. Considere migrar para ME antes de ultrapassar R$ 81.000.</p>
                  </div>
                )}
                {meiUsagePct > 70 && meiUsagePct <= 90 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-300">Faturamento em {meiUsagePct.toFixed(0)}% do limite MEI. Acompanhe de perto nos próximos meses.</p>
                  </div>
                )}
                {monthsWithNoTx > 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <AlertCircle size={15} className="text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-300">{monthsWithNoTx} {monthsWithNoTx === 1 ? 'mês sem' : 'meses sem'} receita registrada no ano. Certifique-se de que todos os lançamentos foram feitos.</p>
                  </div>
                )}
                {profitMargin < 10 && annualRevenue > 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-300">Margem de lucro baixa ({profitMargin.toFixed(1)}%). Revise suas despesas para melhorar a rentabilidade.</p>
                  </div>
                )}
                {annualRevenue === 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                    <AlertCircle size={15} className="text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">Nenhuma receita registrada no ano. Lance suas movimentações para ver os insights.</p>
                  </div>
                )}
                {meiUsagePct <= 70 && annualRevenue > 0 && monthsWithNoTx === 0 && profitMargin >= 10 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <TrendingUp size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-300">Financeiro saudável! Margem de {profitMargin.toFixed(1)}% e limite MEI bem controlado.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </PrintSection>
      </PlanGate>
    </DashboardLayout>
  )
}