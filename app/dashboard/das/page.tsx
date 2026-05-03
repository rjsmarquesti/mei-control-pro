'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Receipt, CheckCircle2, Clock, AlertTriangle, Plus, ExternalLink, Loader2, X, Printer, Filter, Save } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PlanGate } from '@/components/plan/PlanGate'
import { DASCard } from '@/components/dashboard/DASCard'
import DASOnboardingModal from '@/components/dashboard/DASOnboardingModal'
import { useDashboard } from '@/hooks/useDashboard'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface DASEntry {
  id: string
  value: number
  due_date: string
  paid_at: string | null
  status: string
  competencia?: string
}

interface ProfileInfo {
  name: string
  email: string
  cnpj?: string
  city?: string
}

const competenciaLabel = (das: DASEntry) => {
  if (das.competencia) {
    const [y, m] = das.competencia.split('-')
    return new Date(parseInt(y), parseInt(m) - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase())
  }
  // fallback: mês anterior ao vencimento
  if (!das.due_date) return '—'
  const d = new Date(das.due_date + 'T12:00:00')
  d.setMonth(d.getMonth() - 1)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
}

const statusConfig = {
  paid: { label: 'Pago', color: 'text-emerald-400', bg: 'bg-emerald-500/10', Icon: CheckCircle2 },
  overdue: { label: 'Em atraso', color: 'text-red-400', bg: 'bg-red-500/10', Icon: AlertTriangle },
  pending: { label: 'Pendente', color: 'text-amber-400', bg: 'bg-amber-500/10', Icon: Clock },
}

export default function DASPage() {
  const { metrics, isLoading } = useDashboard()
  const { brandSettings, bumpRefresh } = useAppStore()
  const [history, setHistory] = useState<DASEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileInfo | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [newEntry, setNewEntry] = useState({ competencia: '', value: '', due_date: '' })
  const [dasDefaultValue, setDasDefaultValue] = useState('70.60')
  const [multaPct, setMultaPct] = useState(2)
  const [jurosPct, setJurosPct] = useState(0.85)
  const [savingEncargos, setSavingEncargos] = useState(false)
  const [encargosOk, setEncargosOk] = useState(false)
  const [showEncargos, setShowEncargos] = useState(false)
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
  const [showOnboarding, setShowOnboarding] = useState(false)
  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)

    const [{ data: das }, { data: prof }] = await Promise.all([
      supabase.from('das_payments').select('id,value,due_date,paid_at,status,competencia')
        .eq('user_id', session.user.id).order('due_date', { ascending: false }),
      supabase.from('profiles').select('name,email,cnpj,city').eq('id', session.user.id).single(),
    ])

    const list = das ?? []
    setHistory(list)
    setProfile(prof ?? null)

    // Carregar encargos do perfil
    const { data: profileData } = await supabase.from('profiles')
      .select('das_multa_pct,das_juros_pct').eq('id', session.user.id).single()
    if (profileData) {
      setMultaPct(profileData.das_multa_pct ?? 2)
      setJurosPct(profileData.das_juros_pct ?? 1)
    }

    // Carregar valor padrão do DAS
    fetch('/api/das/settings').then(r => r.json()).then(d => {
      if (d.das_default_value) setDasDefaultValue(d.das_default_value)
    })

    setLoading(false)

    if (list.length > 0) {
      const currentYear = new Date().getFullYear()
      const hasCurrentYear = list.some(d => new Date(d.due_date + 'T12:00:00').getFullYear() === currentYear)
      if (!hasCurrentYear) {
        const latestYear = Math.max(...list.map(d => new Date(d.due_date + 'T12:00:00').getFullYear()))
        setYearFilter(latestYear)
      }
    }

    // Onboarding: mostra modal se assinante não tem nenhum DAS
    const prompted = localStorage.getItem('das_onboarding_done')
    if (!prompted && list.length === 0) setShowOnboarding(true)
  }

  useEffect(() => { load() }, [])

  const handleMarkPaid = async (id: string) => {
    const now = new Date().toISOString()
    await supabase.from('das_payments').update({ status: 'paid', paid_at: now }).eq('id', id)
    setHistory(h => h.map(d => d.id === id ? { ...d, status: 'paid', paid_at: now } : d))
    bumpRefresh()
  }

  const handleCompetencia = (val: string) => {
    setNewEntry(prev => {
      if (val.length === 7) {
        const [y, m] = val.split('-').map(Number)
        const due = new Date(y, m, 20).toISOString().split('T')[0]
        return { ...prev, competencia: val, due_date: due }
      }
      return { ...prev, competencia: val }
    })
  }

  const handleAdd = async () => {
    if (!newEntry.value || !newEntry.due_date || !userId) return
    setSaving(true)
    setSaveError('')
    const isOverdue = new Date(newEntry.due_date) < new Date()
    const { data, error } = await supabase.from('das_payments').insert({
      user_id: userId,
      competencia: newEntry.competencia || null,
      value: parseFloat(newEntry.value),
      due_date: newEntry.due_date,
      status: isOverdue ? 'overdue' : 'pending',
    }).select().single()
    if (error) {
      setSaveError('Erro ao salvar DAS. Tente novamente.')
    } else if (data) {
      setHistory([data, ...history])
      setNewEntry({ competencia: '', value: '', due_date: '' })
      setShowForm(false)
      bumpRefresh()
    }
    setSaving(false)
  }

  const handleSaveEncargos = async () => {
    if (!userId) return
    setSavingEncargos(true)
    await supabase.from('profiles').update({ das_multa_pct: multaPct, das_juros_pct: jurosPct }).eq('id', userId)
    setSavingEncargos(false)
    setEncargosOk(true)
    setTimeout(() => setEncargosOk(false), 3000)
  }

  const calcComEncargos = (das: DASEntry) => {
    if (das.status !== 'overdue') return das.value
    const dias = Math.floor((Date.now() - new Date(das.due_date + 'T12:00:00').getTime()) / 86400000)
    // Multa: 0,33% por dia de atraso, limitada a 20% (regra Simples Nacional)
    const multaFrac = Math.min(0.0033 * dias, 0.20)
    // Juros: taxa mensal configurável × meses cheios (regra: mês seguinte ao vencimento até mês do pagamento)
    const mesesCheios = Math.floor(dias / 30)
    const jurosFrac = (jurosPct / 100) * mesesCheios
    return das.value * (1 + multaFrac + jurosFrac)
  }

  const handlePrint = () => window.print()

  const filtered = history.filter(d => {
    const year = new Date(d.due_date + 'T12:00:00').getFullYear()
    return year === yearFilter
  })

  const years = Array.from(new Set(history.map(d => new Date(d.due_date + 'T12:00:00').getFullYear()))).sort((a, b) => b - a)
  if (!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear())

  const paid = filtered.filter(d => d.status === 'paid').length
  const overdue = filtered.filter(d => d.status === 'overdue').length
  const totalPaid = filtered.filter(d => d.status === 'paid').reduce((s, d) => s + d.value, 0)
  const nextPending = history.find(d => d.status === 'pending' || d.status === 'overdue')

  return (
    <DashboardLayout>
      <PlanGate requiredPlan="pro" featureName="DAS & Impostos">
        <>
          {/* Onboarding modal */}
          {showOnboarding && userId && (
            <DASOnboardingModal
              userId={userId}
              onClose={() => { setShowOnboarding(false); localStorage.setItem('das_onboarding_done', '1') }}
              onSaved={() => { setShowOnboarding(false); localStorage.setItem('das_onboarding_done', '1'); load() }}
            />
          )}

          {/* ===== PRINT STYLES ===== */}
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #das-print, #das-print * { visibility: visible !important; }
              #das-print { position: fixed; inset: 0; padding: 32px; background: #fff; color: #000; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3 no-print">
              <div>
                <h2 className="text-xl font-bold text-foreground">DAS & Impostos</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Extrato e histórico de pagamentos do Simples Nacional</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => {
                  setShowForm(!showForm)
                  if (!showForm) setNewEntry(e => ({ ...e, value: e.value || dasDefaultValue }))
                }} className="btn-primary gap-2 text-sm">
                  <Plus size={14} /> Registrar DAS
                </button>
                <button onClick={handlePrint} className="btn-outline gap-2 text-sm">
                  <Printer size={14} /> Imprimir Extrato
                </button>
                <a href="https://www.gov.br/pt-br/servicos/emitir-das-para-pagamento-de-tributos-do-mei"
                  target="_blank" rel="noopener noreferrer" className="btn-outline gap-2 text-xs">
                  <ExternalLink size={14} /> Emitir DAS no gov.br
                </a>
              </div>
            </div>

            {/* Add form */}
            {showForm && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 no-print">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-foreground">Registrar novo DAS</h3>
                  <button onClick={() => setShowForm(false)} className="btn-ghost !p-1.5 !rounded-lg"><X size={16} /></button>
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Competência</label>
                    <input type="month" value={newEntry.competencia} onChange={e => handleCompetencia(e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Vencimento</label>
                    <input type="date" value={newEntry.due_date} onChange={e => setNewEntry({ ...newEntry, due_date: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Valor (R$)</label>
                    <input type="number" step="0.01" value={newEntry.value} onChange={e => setNewEntry({ ...newEntry, value: e.target.value })}
                      placeholder="70.60" className="input-field w-32" />
                  </div>
                  <button onClick={handleAdd} disabled={saving || !newEntry.value || !newEntry.due_date} className="btn-primary gap-2">
                    {saving ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><Plus size={14} />Salvar</>}
                  </button>
                </div>
                {saveError && <p className="text-xs text-red-400 mt-2">{saveError}</p>}
              </motion.div>
            )}

            {/* Year filter */}
            <div className="flex items-center gap-2 no-print">
              <Filter size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Ano:</span>
              <div className="flex gap-1">
                {years.map(y => (
                  <button key={y} onClick={() => setYearFilter(y)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${yearFilter === y ? 'border-violet-500/50 bg-violet-500/15 text-violet-300' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              <div className="sm:col-span-1">
                <DASCard value={nextPending?.value ?? metrics?.dasValue ?? parseFloat(dasDefaultValue)}
                  dueDate={nextPending?.due_date ?? metrics?.dasDueDate ?? ''} isLoading={isLoading || loading} />
              </div>
              <div className="sm:col-span-2 xl:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Pagos em dia', value: paid, suffix: 'guias', color: '#10B981', Icon: CheckCircle2 },
                  { label: 'Em atraso', value: overdue, suffix: 'guias', color: '#EF4444', Icon: AlertTriangle },
                  { label: 'Total pago', value: totalPaid, isCurrency: true, color: '#7C3AED', Icon: Receipt },
                ].map(({ label, value, suffix, isCurrency, color, Icon }, i) => (
                  <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                        <Icon size={16} style={{ color }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                    <p className="text-lg font-bold text-foreground truncate">
                      {isCurrency ? formatCurrency(value as number) : `${value} ${suffix}`}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ===== PRINTABLE EXTRATO ===== */}
            <div id="das-print">
              {/* Print header — only visible on print */}
              <div className="hidden print:block mb-8 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src="/logo.webp" width={40} height={40} alt="MEI Control Pro" style={{ borderRadius: 8 }} />
                    <div>
                      <p className="font-bold text-gray-900 text-lg">MEI Control Pro</p>
                      <p className="text-gray-500 text-xs">Gestão Financeira para MEI</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p className="font-semibold text-gray-700">{profile?.name}</p>
                    {profile?.cnpj && <p>CNPJ: {profile.cnpj}</p>}
                    <p>{profile?.email}</p>
                    {profile?.city && <p>{profile.city}</p>}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 text-xl">Extrato DAS — {yearFilter}</h2>
                  <p className="text-xs text-gray-400">Emitido em: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {/* Table */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 print:shadow-none print:border print:border-gray-200 print:bg-white print:rounded-none">
                <div className="flex items-center justify-between mb-5 no-print">
                  <h3 className="text-base font-bold text-foreground">Extrato {yearFilter}</h3>
                  <span className="text-xs text-muted-foreground">{filtered.length} registro(s)</span>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum DAS registrado para {yearFilter}.</p>
                ) : (
                  <div className="space-y-0 divide-y divide-border/50">
                    {filtered.map((das, i) => {
                      const cfg = statusConfig[das.status as keyof typeof statusConfig] ?? statusConfig.pending
                      return (
                        <motion.div key={das.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0 hover:bg-muted/20 -mx-6 px-6 transition-colors print:hover:bg-transparent print:-mx-0 print:px-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} print:hidden`}>
                              <cfg.Icon size={16} className={cfg.color} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground print:text-gray-900 truncate">
                                {competenciaLabel(das)}
                              </p>
                              <p className="text-xs text-muted-foreground print:text-gray-500 truncate">
                                Vencimento: {formatDate(das.due_date)}
                                {das.paid_at && ` · Pago em: ${formatDate(das.paid_at)}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-bold text-foreground print:text-gray-900">
                                {formatCurrency(calcComEncargos(das))}
                              </p>
                              {das.status === 'overdue' && calcComEncargos(das) > das.value && (
                                <p className="text-[10px] text-muted-foreground line-through">{formatCurrency(das.value)}</p>
                              )}
                              <span className={`text-xs font-semibold ${cfg.color} print:text-gray-600`}>{cfg.label}</span>
                            </div>
                            {das.status !== 'paid' && (
                              <button onClick={() => handleMarkPaid(das.id)} className="no-print text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors whitespace-nowrap">
                                Marcar pago
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}

                {/* Print totals */}
                {filtered.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50 print:border-gray-200 grid grid-cols-3 gap-4 text-center hidden print:grid">
                    <div>
                      <p className="text-xs text-gray-500">Pagos</p>
                      <p className="font-bold text-gray-900">{paid} guia(s)</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Em atraso</p>
                      <p className="font-bold text-gray-900">{overdue} guia(s)</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total pago</p>
                      <p className="font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Print footer */}
              <div className="hidden print:block mt-6 pt-4 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-400">Documento gerado pelo MEI Control Pro · app.sismeipro.com.br · CNPJ 50.406.025/0001-68</p>
                <p className="text-xs text-gray-400">Este é um serviço privado de assessoria — não possui vínculo com o governo federal.</p>
              </div>
            </div>

            {/* Encargos por atraso */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden no-print">
              <button
                onClick={() => setShowEncargos(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/20 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">Configurações de Encargos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Multa e juros aplicados ao valor do DAS em atraso</p>
                </div>
                <span className="text-xs text-muted-foreground">{showEncargos ? '▲' : '▼'}</span>
              </button>
              {showEncargos && (
                <div className="px-5 pb-5 border-t border-border/50">
                  <div className="flex flex-wrap gap-4 items-end mt-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                        Multa por atraso
                      </label>
                      <div className="input-field w-44 flex items-center gap-2 opacity-60 cursor-not-allowed select-none">
                        <span className="text-sm text-foreground">0,33% / dia (máx 20%)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Regra oficial Simples Nacional</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                        Juros ao mês (%)
                      </label>
                      <input
                        type="number" step="0.01" min="0" max="100"
                        value={jurosPct}
                        onChange={e => setJurosPct(parseFloat(e.target.value) || 0)}
                        className="input-field w-28"
                      />
                      <p className="text-xs text-muted-foreground mt-1">SELIC atual ≈ 0,85% a.m.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveEncargos}
                        disabled={savingEncargos}
                        className="btn-primary gap-2 text-sm"
                      >
                        {savingEncargos ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><Save size={14} />Salvar</>}
                      </button>
                      {encargosOk && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={13} /> Salvo</span>}
                    </div>
                  </div>
                  <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-300 font-medium mb-0.5">Estimativa — não use como valor final</p>
                    <p className="text-xs text-amber-200/70">
                      A multa segue a regra oficial do Simples Nacional (0,33%/dia, limitada a 20%). Os juros usam a taxa
                      mensal configurada acima como aproximação da SELIC. O valor exato com a SELIC acumulada real deve
                      ser obtido diretamente no{' '}
                      <a href="https://www.gov.br/pt-br/servicos/emitir-das-para-pagamento-de-tributos-do-mei"
                        target="_blank" rel="noopener noreferrer" className="underline text-amber-300">portal gov.br</a>.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Info */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 border-l-4 no-print" style={{ borderLeftColor: brandSettings.primaryColor }}>
              <p className="text-sm font-semibold text-foreground mb-1">Sobre o DAS MEI</p>
              <p className="text-xs text-muted-foreground">O DAS vence todo dia 20 de cada mês. O sistema envia alertas automáticos 15, 7 e 1 dia antes do vencimento via e-mail, WhatsApp e notificação no sistema.</p>
            </motion.div>
          </div>
        </>
      </PlanGate>
    </DashboardLayout>
  )
}
