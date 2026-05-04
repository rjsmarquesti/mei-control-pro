'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Search, UserCheck, UserX, Shield, ChevronDown, Plus, X, Loader2, Pencil, Calendar, Trash2, Clock, RotateCcw } from 'lucide-react'
import { useAdmin } from '@/hooks/useAdmin'

interface Profile {
  id: string; name: string; email: string; phone: string; city: string
  status: string; role: string; subscription_plan: string
  subscription_expires_at: string | null; updated_at: string
  is_trial?: boolean
}

const PLANS = ['free', 'basic', 'pro', 'premium']

const statusStyle = (s: string) =>
  s === 'blocked' ? 'bg-red-500/20 text-red-400'
  : s === 'suspended' ? 'bg-amber-500/20 text-amber-400'
  : s === 'trial_expired' ? 'bg-orange-500/20 text-orange-400'
  : 'bg-green-500/20 text-green-400'
const statusLabel = (s: string) =>
  s === 'blocked' ? 'Bloqueado'
  : s === 'suspended' ? 'Suspenso'
  : s === 'trial_expired' ? 'Trial expirado'
  : 'Ativo'

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

const emptyForm = { name: '', email: '', password: '', phone: '', city: '', plan: 'free' }

export default function UsuariosPage() {
  const { isAdmin, loading, token } = useAdmin()
  const [users, setUsers] = useState<Profile[]>([])
  const [filtered, setFiltered] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'trial_expired'>('all')
  const [loadingData, setLoadingData] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Edit modal
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', city: '', plan: 'free', status: 'active' })
  const [saving, setSaving] = useState(false)

  const af = (url: string, init?: RequestInit) =>
    fetch(url, { ...init, headers: { ...(init?.headers as object), Authorization: `Bearer ${token ?? ''}` } })

  useEffect(() => { if (isAdmin && token) loadUsers() }, [isAdmin, token])
  useEffect(() => {
    const q = search.toLowerCase()
    const base = tab === 'trial_expired'
      ? users.filter(u => u.status === 'trial_expired')
      : users.filter(u => u.status !== 'trial_expired')
    setFiltered(base.filter(u =>
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.city ?? '').toLowerCase().includes(q)
    ))
  }, [search, users, tab])

  const loadUsers = async () => {
    setLoadingData(true)
    try {
      const data = await af('/api/admin/users').then(r => r.json())
      const list = Array.isArray(data) ? data : []
      setUsers(list); setFiltered(list)
    } finally { setLoadingData(false) }
  }

  const updateUser = async (id: string, updates: Partial<Profile>) => {
    setActionLoading(id)
    await af('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u))
    setActionLoading(null)
    setOpenMenu(null)
  }

  const renewPlan = async (id: string) => {
    const user = users.find(u => u.id === id)
    if (!user || user.subscription_plan === 'free') return
    setActionLoading(id)
    const base = user.subscription_expires_at && new Date(user.subscription_expires_at) > new Date()
      ? new Date(user.subscription_expires_at) : new Date()
    base.setDate(base.getDate() + 30)
    await af('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, subscription_expires_at: base.toISOString() }),
    })
    setUsers(prev => prev.map(u => u.id === id ? { ...u, subscription_expires_at: base.toISOString() } : u))
    setActionLoading(null)
    setOpenMenu(null)
  }

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password) { setCreateError('Email e senha obrigatórios'); return }
    setCreating(true); setCreateError('')
    const res = await af('/api/admin/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    })
    const data = await res.json()
    if (data.error) { setCreateError(data.error); setCreating(false); return }
    setShowCreate(false)
    setCreateForm(emptyForm)
    setCreating(false)
    loadUsers()
  }

  const openEdit = (u: Profile) => {
    setEditUser(u)
    setEditForm({ name: u.name ?? '', phone: u.phone ?? '', city: u.city ?? '', plan: u.subscription_plan ?? 'free', status: u.status ?? 'active' })
  }

  const deleteUser = async (u: Profile) => {
    if (!confirm(`Excluir "${u.name || u.email}" permanentemente? O usuário não conseguirá mais logar.`)) return
    await af('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id }),
    })
    setUsers(prev => prev.filter(x => x.id !== u.id))
  }

  const restoreTrial = async (u: Profile) => {
    if (!confirm(`Restaurar trial de 7 dias para "${u.name || u.email}"?`)) return
    setActionLoading(u.id)
    await af('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, action: 'restore_trial' }),
    })
    const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    setUsers(prev => prev.map(x => x.id === u.id
      ? { ...x, status: 'active', subscription_plan: 'premium', subscription_expires_at: newExpires, is_trial: true }
      : x
    ))
    setActionLoading(null)
    setOpenMenu(null)
  }

  const handleEdit = async () => {
    if (!editUser) return
    setSaving(true)
    const expires = editForm.plan !== 'free'
      ? (editUser.subscription_expires_at && new Date(editUser.subscription_expires_at) > new Date()
        ? editUser.subscription_expires_at
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      : null
    await af('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editUser.id,
        name: editForm.name,
        phone: editForm.phone,
        city: editForm.city,
        status: editForm.status,
        subscription_plan: editForm.plan,
        subscription_expires_at: expires,
      }),
    })
    setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...editForm, subscription_plan: editForm.plan, subscription_expires_at: expires } : u))
    setEditUser(null)
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-blue-400" /></div>

  const inputCls = "w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Usuários</h1>
          <p className="text-sm text-slate-400 mt-0.5">{users.length} cadastrado{users.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all">
            <Plus size={14} /> Novo usuário
          </button>
          <button onClick={loadUsers} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-slate-900/60 border border-white/10 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Todos ({users.filter(u => u.status !== 'trial_expired').length})
        </button>
        <button
          onClick={() => setTab('trial_expired')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${tab === 'trial_expired' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Clock size={11} />
          Trial expirado ({users.filter(u => u.status === 'trial_expired').length})
          {users.filter(u => u.status === 'trial_expired' && daysSince(u.subscription_expires_at) >= 40).length > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {users.filter(u => u.status === 'trial_expired' && daysSince(u.subscription_expires_at) >= 40).length}
            </span>
          )}
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, email ou cidade..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Usuário</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Cidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Plano</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">
                  {tab === 'trial_expired' ? 'Expirado há' : 'Expira'}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loadingData && <tr><td colSpan={6} className="text-center py-12"><RefreshCw size={20} className="animate-spin mx-auto text-slate-500" /></td></tr>}
              {!loadingData && filtered.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-500 text-xs">Nenhum usuário encontrado</td></tr>}
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-xs shrink-0">
                        {((u.name || u.email || '?')[0] ?? '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{u.name ?? 'Sem nome'}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs hidden md:table-cell">{u.city ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-700/50 text-slate-300">
                      {(u.subscription_plan ?? 'free').charAt(0).toUpperCase() + (u.subscription_plan ?? 'free').slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {tab === 'trial_expired' && u.subscription_expires_at ? (() => {
                      const days = daysSince(u.subscription_expires_at)
                      return (
                        <span className={`text-xs font-medium ${days >= 40 ? 'text-red-400' : 'text-orange-400'}`}>
                          {days}d atrás
                          {days >= 40 && <span className="ml-1 text-[10px] bg-red-500/20 px-1.5 py-0.5 rounded-full">Excluir</span>}
                        </span>
                      )
                    })() : u.subscription_expires_at ? (
                      <span className={`text-xs ${new Date(u.subscription_expires_at) < new Date() ? 'text-red-400' : 'text-slate-300'}`}>
                        {new Date(u.subscription_expires_at).toLocaleDateString('pt-BR')}
                      </span>
                    ) : <span className="text-xs text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyle(u.status)}`}>{statusLabel(u.status)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} title="Editar"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                        <Pencil size={13} />
                      </button>
                      {(u.subscription_plan ?? 'free') !== 'free' && (
                        <button onClick={() => renewPlan(u.id)} title="Renovar +30 dias" disabled={actionLoading === u.id}
                          className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-all">
                          <Calendar size={13} />
                        </button>
                      )}
                      <div className="relative inline-block">
                        <button onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center gap-1 text-xs">
                          <ChevronDown size={12} />
                        </button>
                        {openMenu === u.id && (
                          <div className="absolute right-0 top-8 z-50 min-w-[170px] rounded-xl border border-white/10 bg-slate-900 shadow-xl py-1">
                            {u.status === 'trial_expired' ? (
                              <>
                                <button onClick={() => { setOpenMenu(null); restoreTrial(u) }} className="w-full text-left px-3 py-2 text-xs text-green-400 hover:bg-white/5 flex items-center gap-2"><RotateCcw size={13} /> Restaurar trial 7d</button>
                                <button onClick={() => { setOpenMenu(null); deleteUser(u) }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5 flex items-center gap-2 border-t border-white/10"><Trash2 size={13} /> Excluir conta</button>
                              </>
                            ) : (
                              <>
                                {u.status !== 'active' && <button onClick={() => updateUser(u.id, { status: 'active' })} className="w-full text-left px-3 py-2 text-xs text-green-400 hover:bg-white/5 flex items-center gap-2"><UserCheck size={13} /> Ativar</button>}
                                {u.status !== 'suspended' && <button onClick={() => updateUser(u.id, { status: 'suspended' })} className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-white/5 flex items-center gap-2"><UserX size={13} /> Suspender</button>}
                                {u.status !== 'blocked' && <button onClick={() => updateUser(u.id, { status: 'blocked' })} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5 flex items-center gap-2"><UserX size={13} /> Bloquear</button>}
                                {u.role !== 'admin' && <button onClick={() => updateUser(u.id, { role: 'admin' })} className="w-full text-left px-3 py-2 text-xs text-blue-400 hover:bg-white/5 flex items-center gap-2 border-t border-white/10"><Shield size={13} /> Tornar Admin</button>}
                                <button onClick={() => { setOpenMenu(null); deleteUser(u) }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5 flex items-center gap-2 border-t border-white/10"><Trash2 size={13} /> Excluir</button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openMenu && <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="absolute inset-0 bg-black/70" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl z-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-white">Novo Usuário</h2>
                <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <input placeholder="Nome completo" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} className={inputCls} />
                <input placeholder="Email *" type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} className={inputCls} />
                <input placeholder="Senha * (mínimo 6 caracteres)" type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} className={inputCls} />
                <input placeholder="Telefone / WhatsApp" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} className={inputCls} />
                <input placeholder="Cidade" value={createForm.city} onChange={e => setCreateForm({ ...createForm, city: e.target.value })} className={inputCls} />
                <select value={createForm.plan} onChange={e => setCreateForm({ ...createForm, plan: e.target.value })} className={inputCls}>
                  {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
                {createError && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{createError}</p>}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
                  <button onClick={handleCreate} disabled={creating} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2">
                    {creating ? <><Loader2 size={14} className="animate-spin" /> Criando...</> : 'Criar usuário'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditUser(null)} className="absolute inset-0 bg-black/70" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl z-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-white">Editar Usuário</h2>
                <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <p className="text-xs text-slate-400 mb-4">{editUser.email}</p>
              <div className="space-y-3">
                <input placeholder="Nome" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
                <input placeholder="Telefone" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className={inputCls} />
                <input placeholder="Cidade" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} className={inputCls} />
                <div className="grid grid-cols-2 gap-3">
                  <select value={editForm.plan} onChange={e => setEditForm({ ...editForm, plan: e.target.value })} className={inputCls}>
                    {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                  <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className={inputCls}>
                    <option value="active">Ativo</option>
                    <option value="suspended">Suspenso</option>
                    <option value="blocked">Bloqueado</option>
                    <option value="trial_expired">Trial expirado</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditUser(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
                  <button onClick={handleEdit} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
