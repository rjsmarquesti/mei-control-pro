'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { useAdmin } from '@/hooks/useAdmin'

type TrialStatus = 'ativo' | 'expirando' | 'convertido' | 'expirado'

interface TrialRow {
  id: string
  nome: string
  email: string
  plano: string
  trial_iniciado: string | null
  expira_em: string | null
  dias_restantes: number | null
  status: TrialStatus
}

interface Metricas {
  ativos: number
  expirando: number
  convertidos: number
  expirados: number
  taxaConversao: number
}

const STATUS_LABEL: Record<TrialStatus, string> = {
  ativo: 'Ativo',
  expirando: 'Expirando',
  convertido: 'Convertido',
  expirado: 'Expirado',
}

const STATUS_COLOR: Record<TrialStatus, string> = {
  ativo: '#10B981',
  expirando: '#F59E0B',
  convertido: '#7C3AED',
  expirado: '#6B7280',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function MetricCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number | string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 border"
      style={{ background: `${color}0d`, borderColor: `${color}30` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-xs font-semibold mt-0.5" style={{ color }}>{sub}</p>}
    </motion.div>
  )
}

export default function Conversoes() {
  const { token, isAdmin, loading: adminLoading } = useAdmin()
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [lista, setLista] = useState<TrialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TrialStatus | 'todos'>('todos')

  const af = (url: string) =>
    fetch(url, { headers: { Authorization: `Bearer ${token ?? ''}` } })

  async function load() {
    setLoading(true)
    try {
      const res = await af('/api/admin/conversoes')
      const data = await res.json()
      setMetricas(data.metricas)
      setLista(data.lista ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!adminLoading && isAdmin && token) load()
  }, [adminLoading, isAdmin, token])

  const filtered = filter === 'todos' ? lista : lista.filter(r => r.status === filter)

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm gap-2">
        <RefreshCw size={16} className="animate-spin" /> Carregando...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Conversões de Trial</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Acompanhamento de trials ativos, expirados e convertidos</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {/* Métricas */}
      {metricas && (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <MetricCard label="Trials ativos" value={metricas.ativos} icon={TrendingUp} color="#10B981" />
          <MetricCard label="Expirando em 7 dias" value={metricas.expirando} icon={AlertTriangle} color="#F59E0B" />
          <MetricCard label="Convertidos" value={metricas.convertidos} icon={CheckCircle} color="#7C3AED" />
          <MetricCard label="Expirados sem converter" value={metricas.expirados} icon={XCircle} color="#6B7280" />
          <MetricCard
            label="Taxa de conversão"
            value={`${metricas.taxaConversao}%`}
            sub={`${metricas.convertidos} de ${metricas.convertidos + metricas.expirados} trials`}
            icon={TrendingUp}
            color="#06B6D4"
          />
        </div>
      )}

      {/* Filtro de status */}
      <div className="flex gap-2 flex-wrap">
        {(['todos', 'expirando', 'ativo', 'convertido', 'expirado'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
            style={filter === s
              ? { background: s === 'todos' ? '#7C3AED' : STATUS_COLOR[s as TrialStatus], color: '#fff', borderColor: 'transparent' }
              : { background: 'transparent', color: 'var(--muted-foreground)', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            {s === 'todos' ? 'Todos' : STATUS_LABEL[s as TrialStatus]}
            {s !== 'todos' && metricas && (
              <span className="ml-1 opacity-70">
                ({s === 'expirando' ? metricas.expirando : s === 'ativo' ? metricas.ativos : s === 'convertido' ? metricas.convertidos : metricas.expirados})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nome / Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Plano atual</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Trial iniciado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Expira em</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Dias restantes</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                  Nenhum registro encontrado
                </td>
              </tr>
            )}
            {filtered.map(row => (
              <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground text-xs">{row.nome}</p>
                  <p className="text-muted-foreground text-[11px]">{row.email}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="capitalize text-xs text-foreground">{row.plano}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{fmt(row.trial_iniciado)}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{fmt(row.expira_em)}</td>
                <td className="px-4 py-3 text-xs">
                  {row.status === 'convertido'
                    ? <span className="text-muted-foreground">—</span>
                    : row.dias_restantes !== null && row.dias_restantes > 0
                      ? <span style={{ color: row.dias_restantes <= 7 ? '#F59E0B' : '#10B981' }}>{row.dias_restantes}d</span>
                      : <span className="text-muted-foreground">Expirado</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: `${STATUS_COLOR[row.status]}20`, color: STATUS_COLOR[row.status] }}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
