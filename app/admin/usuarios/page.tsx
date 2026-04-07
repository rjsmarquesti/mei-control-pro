'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Search, UserCheck, UserX, Shield, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/hooks/useAdmin'

interface Profile {
  id: string
  name: string
  email: string
  phone: string
  city: string
  status: string
  role: string
  subscription_plan: string
  subscription_expires_at: string | null
  created_at: string
  updated_at: string
}

const PLANS = ['free', 'basic', 'pro', 'premium']
const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo', color: 'bg-green-500/20 text-green-400' },
  { value: 'suspended', label: 'Suspenso', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'blocked', label: 'Bloqueado', color: 'bg-red-500/20 text-red-400' },
]

export default function UsuariosPage() {
  const { isAdmin, loading } = useAdmin()
  const [users, setUsers] = useState<Profile[]>([])
  const [filtered, setFiltered] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    loadUsers()
  }, [isAdmin])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      users.filter(u =>
        (u.name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.city ?? '').toLowerCase().includes(q)
      )
    )
  }, [search, users])

  const loadUsers = async () => {
    setLoadingData(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false })
    setUsers(data ?? [])
    setFiltered(data ?? [])
    setLoadingData(false)
  }

  const updateUser = async (id: string, updates: Partial<Profile>) => {
    setActionLoading(id)
    await supabase.from('profiles').update(updates).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u))
    setActionLoading(null)
    setOpenMenu(null)
  }

  const statusStyle = (status: string) => {
    if (status === 'blocked') return 'bg-red-500/20 text-red-400'
    if (status === 'suspended') return 'bg-amber-500/20 text-amber-400'
    return 'bg-green-500/20 text-green-400'
  }

  const statusLabel = (status: string) => {
    if (status === 'blocked') return 'Bloqueado'
    if (status === 'suspended') return 'Suspenso'
    return 'Ativo'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin text-blue-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Usuários</h1>
          <p className="text-sm text-slate-400 mt-0.5">{users.length} cadastrado{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={loadUsers}
          className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, email ou cidade..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Usuário</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Cidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Plano</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loadingData && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    <RefreshCw size={20} className="animate-spin mx-auto" />
                  </td>
                </tr>
              )}
              {!loadingData && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500 text-xs">Nenhum usuário encontrado</td>
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
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-xs shrink-0">
                        {(u.name ?? u.email ?? '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{u.name ?? 'Sem nome'}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs hidden md:table-cell">{u.city ?? '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.subscription_plan ?? 'free'}
                      onChange={e => updateUser(u.id, { subscription_plan: e.target.value })}
                      disabled={actionLoading === u.id}
                      className="text-xs px-2 py-1 rounded-lg bg-slate-800 border border-white/10 text-slate-300 outline-none cursor-pointer"
                    >
                      {PLANS.map(p => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyle(u.status)}`}>
                      {statusLabel(u.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center gap-1 text-xs"
                      >
                        Ações <ChevronDown size={12} />
                      </button>
                      {openMenu === u.id && (
                        <div className="absolute right-0 top-8 z-50 min-w-[150px] rounded-xl border border-white/10 bg-slate-900 shadow-xl py-1">
                          {u.status !== 'active' && (
                            <button
                              onClick={() => updateUser(u.id, { status: 'active' })}
                              className="w-full text-left px-3 py-2 text-xs text-green-400 hover:bg-white/5 flex items-center gap-2"
                            >
                              <UserCheck size={13} /> Ativar
                            </button>
                          )}
                          {u.status !== 'suspended' && (
                            <button
                              onClick={() => updateUser(u.id, { status: 'suspended' })}
                              className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-white/5 flex items-center gap-2"
                            >
                              <UserX size={13} /> Suspender
                            </button>
                          )}
                          {u.status !== 'blocked' && (
                            <button
                              onClick={() => updateUser(u.id, { status: 'blocked' })}
                              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5 flex items-center gap-2"
                            >
                              <UserX size={13} /> Bloquear
                            </button>
                          )}
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => updateUser(u.id, { role: 'admin' })}
                              className="w-full text-left px-3 py-2 text-xs text-blue-400 hover:bg-white/5 flex items-center gap-2 border-t border-white/10"
                            >
                              <Shield size={13} /> Tornar Admin
                            </button>
                          )}
                          {u.role === 'admin' && (
                            <button
                              onClick={() => updateUser(u.id, { role: 'user' })}
                              className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-white/5 flex items-center gap-2 border-t border-white/10"
                            >
                              <Shield size={13} /> Remover Admin
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Click outside to close menu */}
      {openMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  )
}
