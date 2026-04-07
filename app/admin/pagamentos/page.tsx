'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Search, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/hooks/useAdmin'

interface UserPayment {
  id: string
  name: string
  email: string
  phone: string
  city: string
  subscription_plan: string
  subscription_expires_at: string | null
  status: string
  updated_at: string
}

const PLANS = ['free', 'basic', 'pro', 'premium']

const planColor = (plan: string) => {
  if (plan === 'premium') return 'bg-amber-500/20 text-amber-400'
  if (plan === 'pro') return 'bg-violet-500/20 text-violet-400'
  if (plan === 'basic') return 'bg-blue-500/20 text-blue-400'
  return 'bg-slate-700/50 text-slate-400'
}

export default function PagamentosPage() {
  const { isAdmin, loading } = useAdmin()
  const [users, setUsers] = useState<UserPayment[]>([])
  const [filtered, setFiltered] = useState<UserPayment[]>([])
  const [search, setSearch] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filterPlan, setFilterPlan] = useState('all')

  useEffect(() => {
    if (!isAdmin) return
    loadData()
  }, [isAdmin])

  useEffect(() => {
    let result = users
    if (filterPlan !== 'all') {
      result = result.filter(u => u.subscription_plan === filterPlan)
    }
    const q = search.toLowerCase()
    if (q) {
      result = result.filter(u =>
        (u.name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [search, users, filterPlan])

  const loadData = async () => {
    setLoadingData(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, phone, city, subscription_plan, subscription_expires_at, status, updated_at')
      .order('updated_at', { ascending: false })
    setUsers(data ?? [])
    setFiltered(data ?? [])
    setLoadingData(false)
  }

  const updatePlan = async (id: string, plan: string) => {
    setActionLoading(id)
    const expires = plan === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('profiles').update({
      subscription_plan: plan,
      subscription_expires_at: expires,
    }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id
      ? { ...u, subscription_plan: plan, subscription_expires_at: expires }
      : u
    ))
    setActionLoading(null)
  }

  const extendPlan = async (id: string) => {
    setActionLoading(id)
    const user = users.find(u => u.id === id)
    const base = user?.subscription_expires_at ? new Date(user.subscription_expires_at) : new Date()
    if (base < new Date()) base.setTime(Date.now())
    base.setDate(base.getDate() + 30)
    await supabase.from('profiles').update({ subscription_expires_at: base.toISOString() }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id
      ? { ...u, subscription_expires_at: base.toISOString() }
      : u
    ))
    setActionLoading(null)
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR')
  }

  const isExpired = (d: string | null) => {
    if (!d) return false
    return new Date(d) < new Date()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin text-blue-400" />
    </div>
  )

  const paidCount = users.filter(u => u.subscription_plan !== 'free').length
  const expiredCount = users.filter(u => u.subscription_expires_at && isExpired(u.subscription_expires_at)).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pagamentos</h1>
          <p className="text-sm text-slate-400 mt-0.5">{paidCount} assinante{paidCount !== 1 ? 's' : ''} · {expiredCount} expirado{expiredCount !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PLANS.map(plan => {
          const count = users.filter(u => (u.subscription_plan ?? 'free') === plan).length
          return (
            <div key={plan} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
              <p className="text-xs text-slate-400 mb-1">{plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
              <p className="text-xl font-bold text-white">{count}</p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50"
          />
        </div>
        <select
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-sm text-slate-300 outline-none"
        >
          <option value="all">Todos os planos</option>
          {PLANS.map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Usuário</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Plano</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Expira em</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loadingData && (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <RefreshCw size={20} className="animate-spin mx-auto text-slate-500" />
                  </td>
                </tr>
              )}
              {!loadingData && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500 text-xs">Nenhum resultado</td>
                </tr>
              )}
              {filtered.map((u, i) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white text-sm">{u.name ?? 'Sem nome'}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${planColor(u.subscription_plan ?? 'free')}`}>
                      {(u.subscription_plan ?? 'free').charAt(0).toUpperCase() + (u.subscription_plan ?? 'free').slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {u.subscription_expires_at ? (
                      <span className={`text-xs ${isExpired(u.subscription_expires_at) ? 'text-red-400' : 'text-slate-300'}`}>
                        {isExpired(u.subscription_expires_at) ? '⚠ ' : ''}{formatDate(u.subscription_expires_at)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={u.subscription_plan ?? 'free'}
                        onChange={e => updatePlan(u.id, e.target.value)}
                        disabled={actionLoading === u.id}
                        className="text-xs px-2 py-1 rounded-lg bg-slate-800 border border-white/10 text-slate-300 outline-none cursor-pointer"
                      >
                        {PLANS.map(p => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                      {(u.subscription_plan ?? 'free') !== 'free' && (
                        <button
                          onClick={() => extendPlan(u.id)}
                          disabled={actionLoading === u.id}
                          title="+30 dias"
                          className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-all"
                        >
                          <Calendar size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
