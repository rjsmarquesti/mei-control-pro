'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Wallet, DollarSign, BarChart3,
  Calendar, Target, AlertCircle, CheckCircle2, Clock,
  ArrowUpRight, ArrowDownLeft, PieChart, LineChart as LineChartIcon,
  Download, RefreshCw, ChevronUp, ChevronDown, Minus,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PlanGate } from '@/components/plan/PlanGate'
import { PrintButton } from '@/components/ui/PrintButton'
import { useDashboard } from '@/hooks/useDashboard'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const MEI_LIMIT = 81000
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

interface Transaction {
  id: string; type: 'revenue' | 'expense'; value: number
  category: string; description: string; date: string; status: string
}
interface DasPayment {
  id: string; value: number; due_date: string; status: string; competencia: string
}

type Tab = 'visao-geral' | 'fluxo' | 'categorias' | 'das' | 'transacoes'

const CATEGORY_COLORS = [
  '#7C3AED','#06B6D4','#10B981','#F59E0B','#EF4444','#8B5CF6','#6B7280','#EC4899','#14B8A6','#F97316',
]

function Trend({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus size={11} /> 0%</span>
  const pos = pct > 0
  return (
    <span className={`text-xs flex items-center gap-0.5 ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
      {pos ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function KpiCard({ title, value, sub, icon: Icon, color, trend }: {
  title: string; value: string; sub?: string
  icon: any; color: string; trend?: number
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && <Trend pct={trend} />}
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card p-3 text-xs space-y-1 shadow-xl">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function ControleFinanceiroPage() {
  const { metrics, chartData, categoryData, isLoading } = useDashboard()
  const { bumpRefresh } = useAppStore()
  const [tab, setTab] = useState<Tab>('visao-geral')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [dasPayments, setDasPayments] = useState<DasPayment[]>([])
  const [loadingExtra, setLoadingExtra] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'revenue' | 'expense'>('all')
  const [filterMonth, setFilterMonth] = useState<number>(-1) // -1 = todos

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const year = new Date().getFullYear()
      const [{ data: tx }, { data: das }] = await Promise.all([
        supabase.from('transactions')
          .select('id,type,value,category,description,date,status')
          .eq('user_id', session.user.id)
          .gte('date', `${year}-01-01`)
          .lte('date', `${year}-12-31`)
          .order('date', { ascending: false }),
        supabase.from('das_payments')
          .select('id,value,due_date,status,competencia')
          .eq('user_id', session.user.id)
          .order('due_date', { ascending: false }),
      ])
      if (tx) setTransactions(tx as Transaction[])
      if (das) setDasPayments(das as DasPayment[])
      setLoadingExtra(false)
    }
    load()
  }, [])

  // ── KPIs ──────────────────────────────────────────────────────────
  const annualRevenue = chartData.reduce((s, d) => s + d.receita, 0)
  const annualExpenses = chartData.reduce((s, d) => s + d.despesa, 0)
  const annualProfit = annualRevenue - annualExpenses
  const profitMargin = annualRevenue > 0 ? (annualProfit / annualRevenue) * 100 : 0
  const meiUsagePct = (annualRevenue / MEI_LIMIT) * 100
  const avgMonthly = chartData.filter(d => d.receita > 0).length > 0
    ? annualRevenue / chartData.filter(d => d.receita > 0).length : 0
  const revenueCount = transactions.filter(t => t.type === 'revenue').length
  const avgTicket = revenueCount > 0 ? annualRevenue / revenueCount : 0

  // ── Comparativo meses ─────────────────────────────────────────────
  const lastTwo = chartData.slice(-2)
  const currMonth = lastTwo[1] ?? { receita: 0, despesa: 0, lucro: 0 }
  const prevMonth = lastTwo[0] ?? { receita: 0, despesa: 0, lucro: 0 }
  const pct = (a: number, b: number) => b > 0 ? ((a - b) / b) * 100 : 0

  // ── Fluxo acumulado ───────────────────────────────────────────────
  const cumulativeData = chartData.reduce<{ month: string; acumulado: number }[]>((acc, d, i) => {
    const prev = i > 0 ? acc[i - 1].acumulado : 0
    acc.push({ month: d.month, acumulado: prev + d.lucro })
    return acc
  }, [])

  // ── Categorias (receitas + despesas separadas) ────────────────────
  const catMap: Record<string, { revenue: number; expense: number }> = {}
  transactions.forEach(t => {
    if (!catMap[t.category]) catMap[t.category] = { revenue: 0, expense: 0 }
    if (t.type === 'revenue') catMap[t.category].revenue += t.value
    else catMap[t.category].expense += t.value
  })
  const catList = Object.entries(catMap)
    .map(([name, v]) => ({ name, revenue: v.revenue, expense: v.expense, total: v.revenue + v.expense }))
    .sort((a, b) => b.total - a.total)
  const pieData = catList.map(c => ({ name: c.name, value: c.revenue + c.expense }))

  // ── DAS stats ─────────────────────────────────────────────────────
  const dasPaid = dasPayments.filter(d => d.status === 'paid')
  const dasPending = dasPayments.filter(d => d.status === 'pending')
  const dasOverdue = dasPayments.filter(d => d.status === 'overdue')
  const dasTotalPaid = dasPaid.reduce((s, d) => s + d.value, 0)
  const dasTotalPending = dasPending.reduce((s, d) => s + d.value, 0)

  // ── Transações filtradas ──────────────────────────────────────────
  const filteredTx = transactions.filter(t => {
    const matchType = filterType === 'all' || t.type === filterType
    const matchMonth = filterMonth === -1 || new Date(t.date).getMonth() === filterMonth
    return matchType && matchMonth
  })

  // ── Alertas ───────────────────────────────────────────────────────
  const alertas: { msg: string; level: 'warn' | 'danger' | 'ok' }[] = []
  if (meiUsagePct >= 100) alertas.push({ msg: `Limite MEI ultrapassado! Faturamento em ${meiUsagePct.toFixed(0)}%`, level: 'danger' })
  else if (meiUsagePct >= 75) alertas.push({ msg: `Atenção: ${meiUsagePct.toFixed(0)}% do limite MEI atingido`, level: 'warn' })
  if (dasOverdue.length > 0) alertas.push({ msg: `${dasOverdue.length} DAS em atraso`, level: 'danger' })
  if (annualProfit < 0) alertas.push({ msg: 'Prejuízo anual — despesas superam receitas', level: 'danger' })
  if (profitMargin < 10 && profitMargin >= 0 && annualRevenue > 0) alertas.push({ msg: 'Margem de lucro abaixo de 10%', level: 'warn' })
  if (alertas.length === 0 && annualRevenue > 0) alertas.push({ msg: 'Finanças saudáveis — sem alertas', level: 'ok' })

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'visao-geral', label: 'Visão Geral', icon: BarChart3 },
    { id: 'fluxo', label: 'Fluxo de Caixa', icon: LineChartIcon },
    { id: 'categorias', label: 'Categorias', icon: PieChart },
    { id: 'das', label: 'DAS', icon: Calendar },
    { id: 'transacoes', label: 'Lançamentos', icon: ArrowUpRight },
  ]

  return (
    <DashboardLayout>
      <PlanGate requiredPlan="pro" featureName="Controle Financeiro Completo">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Controle Financeiro</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Visão consolidada de toda a sua saúde financeira</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => bumpRefresh()} className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-all">
              <RefreshCw size={15} />
            </button>
            <PrintButton />
          </div>
        </div>

        {/* Alertas */}
        {alertas.map((a, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
              ${a.level === 'danger' ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : a.level === 'warn' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'}`}>
            {a.level === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {a.msg}
          </motion.div>
        ))}

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/40 p-1 rounded-xl overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                ${tab === t.id ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {/* ── VISÃO GERAL ─────────────────────────────────────── */}
            {tab === 'visao-geral' && (
              <div className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  <KpiCard title="Receita Anual" value={formatCurrency(annualRevenue)} sub="jan–dez" icon={TrendingUp} color="#10B981" trend={pct(currMonth.receita, prevMonth.receita)} />
                  <KpiCard title="Despesas Anuais" value={formatCurrency(annualExpenses)} icon={TrendingDown} color="#EF4444" trend={pct(currMonth.despesa, prevMonth.despesa)} />
                  <KpiCard title="Lucro Líquido" value={formatCurrency(annualProfit)} sub={`margem ${profitMargin.toFixed(1)}%`} icon={Wallet} color="#7C3AED" trend={pct(currMonth.lucro, prevMonth.lucro)} />
                  <KpiCard title="Ticket Médio" value={formatCurrency(avgTicket)} sub={`${revenueCount} receitas`} icon={DollarSign} color="#06B6D4" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="grid grid-cols-1 gap-4">
                    <KpiCard title="Média Mensal" value={formatCurrency(avgMonthly)} sub="meses com lançamentos" icon={BarChart3} color="#F59E0B" />
                    {/* MEI Gauge */}
                    <div className="glass-card p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Limite MEI</span>
                        <Target size={15} className="text-muted-foreground" />
                      </div>
                      <p className="text-xl font-bold text-foreground">{meiUsagePct.toFixed(1)}%</p>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(meiUsagePct, 100)}%`,
                            background: meiUsagePct >= 100 ? '#EF4444' : meiUsagePct >= 75 ? '#F59E0B' : '#10B981',
                          }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(annualRevenue)}</span>
                        <span>{formatCurrency(MEI_LIMIT)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Gráfico barras anual */}
                  <div className="glass-card p-5 xl:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground mb-4">Receita vs Despesa — {new Date().getFullYear()}</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData} barSize={8}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="receita" name="Receita" fill="#10B981" radius={[3,3,0,0]} />
                        <Bar dataKey="despesa" name="Despesa" fill="#EF4444" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Comparativo mês atual vs anterior */}
                <div className="glass-card p-5">
                  <p className="text-xs font-medium text-muted-foreground mb-4">Comparativo — {lastTwo[1]?.month ?? '-'} vs {lastTwo[0]?.month ?? '-'}</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Receita', curr: currMonth.receita, prev: prevMonth.receita, color: '#10B981' },
                      { label: 'Despesa', curr: currMonth.despesa, prev: prevMonth.despesa, color: '#EF4444' },
                      { label: 'Lucro', curr: currMonth.lucro, prev: prevMonth.lucro, color: '#7C3AED' },
                    ].map(({ label, curr, prev: p, color }) => (
                      <div key={label} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-base font-bold" style={{ color }}>{formatCurrency(curr)}</p>
                        <Trend pct={pct(curr, p)} />
                        <p className="text-xs text-muted-foreground">anterior: {formatCurrency(p)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── FLUXO DE CAIXA ──────────────────────────────────── */}
            {tab === 'fluxo' && (
              <div className="space-y-6">
                <div className="glass-card p-5">
                  <p className="text-xs font-medium text-muted-foreground mb-4">Fluxo mensal — Receita vs Despesa vs Lucro</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="receita" name="Receita" stroke="#10B981" fill="url(#gradReceita)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#EF4444" fill="url(#gradDespesa)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#7C3AED" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="glass-card p-5">
                  <p className="text-xs font-medium text-muted-foreground mb-4">Saldo acumulado</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={cumulativeData}>
                      <defs>
                        <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="acumulado" name="Saldo" stroke="#7C3AED" fill="url(#gradAcum)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── CATEGORIAS ──────────────────────────────────────── */}
            {tab === 'categorias' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="glass-card p-5">
                    <p className="text-xs font-medium text-muted-foreground mb-4">Distribuição por categoria</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <RechartsPie>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {pieData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>

                  <div className="glass-card p-5">
                    <p className="text-xs font-medium text-muted-foreground mb-4">Receita vs Despesa por categoria</p>
                    <div className="space-y-3 overflow-y-auto max-h-[260px]">
                      {catList.map((cat, i) => {
                        const total = cat.revenue + cat.expense
                        const revPct = total > 0 ? (cat.revenue / total) * 100 : 0
                        return (
                          <div key={cat.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                                <span className="text-foreground font-medium">{cat.name}</span>
                              </div>
                              <span className="text-muted-foreground">{formatCurrency(total)}</span>
                            </div>
                            <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                              <div className="h-full bg-emerald-500" style={{ width: `${revPct}%` }} />
                              <div className="h-full bg-red-500" style={{ width: `${100 - revPct}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>+ {formatCurrency(cat.revenue)}</span>
                              <span>- {formatCurrency(cat.expense)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── DAS ─────────────────────────────────────────────── */}
            {tab === 'das' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <KpiCard title="DAS Pago" value={formatCurrency(dasTotalPaid)} sub={`${dasPaid.length} guias`} icon={CheckCircle2} color="#10B981" />
                  <KpiCard title="DAS Pendente" value={formatCurrency(dasTotalPending)} sub={`${dasPending.length} guias`} icon={Clock} color="#F59E0B" />
                  <KpiCard title="DAS em Atraso" value={`${dasOverdue.length}`} sub={`${dasOverdue.length > 0 ? 'regularize agora' : 'nenhum'}`} icon={AlertCircle} color={dasOverdue.length > 0 ? '#EF4444' : '#6B7280'} />
                </div>

                <div className="glass-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/50">
                    <p className="text-sm font-semibold text-foreground">Histórico DAS</p>
                  </div>
                  {dasPayments.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">Nenhum DAS registrado</div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {dasPayments.map(d => (
                        <div key={d.id} className="flex items-center gap-4 px-5 py-3">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${d.status === 'paid' ? 'bg-emerald-500' : d.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{d.competencia ?? '—'}</p>
                            <p className="text-xs text-muted-foreground">Vence: {d.due_date ? new Date(d.due_date).toLocaleDateString('pt-BR') : '—'}</p>
                          </div>
                          <p className="text-sm font-semibold text-foreground">{formatCurrency(d.value)}</p>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                            d.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400'
                            : d.status === 'overdue' ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {d.status === 'paid' ? 'Pago' : d.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── LANÇAMENTOS ─────────────────────────────────────── */}
            {tab === 'transacoes' && (
              <div className="space-y-4">
                {/* Filtros */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
                    {(['all', 'revenue', 'expense'] as const).map(t => (
                      <button key={t} onClick={() => setFilterType(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${filterType === t ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        {t === 'all' ? 'Todos' : t === 'revenue' ? 'Receitas' : 'Despesas'}
                      </button>
                    ))}
                  </div>
                  <select
                    value={filterMonth}
                    onChange={e => setFilterMonth(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-xl bg-muted/40 border border-border/50 text-xs text-foreground focus:outline-none"
                  >
                    <option value={-1}>Todos os meses</option>
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  <span className="ml-auto text-xs text-muted-foreground self-center">{filteredTx.length} lançamentos</span>
                </div>

                <div className="glass-card overflow-hidden">
                  {filteredTx.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">Nenhum lançamento encontrado</div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {filteredTx.map(t => (
                        <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0
                            ${t.type === 'revenue' ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                            {t.type === 'revenue'
                              ? <ArrowDownLeft size={14} className="text-emerald-400" />
                              : <ArrowUpRight size={14} className="text-red-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{t.description}</p>
                            <p className="text-xs text-muted-foreground">{t.category} · {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <p className={`text-sm font-bold shrink-0 ${t.type === 'revenue' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {t.type === 'revenue' ? '+' : '-'}{formatCurrency(t.value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
      </PlanGate>
    </DashboardLayout>
  )
}
