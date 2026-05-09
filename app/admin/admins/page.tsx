'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Plus, Pencil, Trash2, X, Loader2, RefreshCw, KeyRound, UserMinus } from 'lucide-react'
import { useAdmin } from '@/hooks/useAdmin'

interface AdminUser {
  id: string
  name: string
  email: string
  status: string
  updated_at: string
}

const emptyCreate = { name: '', email: '', password: '', confirmPassword: '' }
const emptyEdit = { name: '', password: '', confirmPassword: '' }

export default function AdminsPage() {
  const { isAdmin, loading, token } = useAdmin()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState(emptyEdit)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)
  const [deleteAccount, setDeleteAccount] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const af = (url: string, init?: RequestInit) =>
    fetch(url, { ...init, headers: { ...(init?.headers as object), Authorization: `Bearer ${token ?? ''}` } })

  useEffect(() => { if (isAdmin && token) load() }, [isAdmin, token])

  const load = async () => {
    setLoadingData(true)
    try {
      const data = await af('/api/admin/admins').then(r => r.json())
      setAdmins(Array.isArray(data) ? data : [])
    } finally { setLoadingData(false) }
  }

  const handleCreate = async () => {
    setCreateError('')
    if (!createForm.email || !createForm.password) { setCreateError('Email e senha obrigatórios'); return }
    if (createForm.password !== createForm.confirmPassword) { setCreateError('As senhas não coincidem'); return }
    if (createForm.password.length < 8) { setCreateError('Senha mínima: 8 caracteres'); return }
    setCreating(true)
    try {
      const res = await af('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createForm.name, email: createForm.email, password: createForm.password }),
      })
      const json = await res.json()
      if (!res.ok) { setCreateError(json.error ?? 'Erro ao criar admin'); return }
      setShowCreate(false)
      setCreateForm(emptyCreate)
      load()
    } finally { setCreating(false) }
  }

  const handleEdit = async () => {
    setEditError('')
    if (editForm.password && editForm.password !== editForm.confirmPassword) { setEditError('As senhas não coincidem'); return }
    if (editForm.password && editForm.password.length < 8) { setEditError('Senha mínima: 8 caracteres'); return }
    setSaving(true)
    try {
      const body: Record<string, string> = { id: editAdmin!.id }
      if (editForm.name) body.name = editForm.name
      if (editForm.password) body.password = editForm.password
      const res = await af('/api/admin/admins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setEditError(json.error ?? 'Erro ao salvar'); return }
      setEditAdmin(null)
      setEditForm(emptyEdit)
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await af('/api/admin/admins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmDelete.id, deleteAccount }),
      })
      setConfirmDelete(null)
      load()
    } finally { setDeleting(false) }
  }

  if (loading) return null

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Administradores</h2>
          <p className="text-sm text-blue-300 mt-0.5">Gerencie contas e senhas dos admins do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg text-blue-300 hover:bg-white/10 transition-all">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => { setShowCreate(true); setCreateError('') }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all"
          >
            <Plus size={15} /> Novo Admin
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {loadingData ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))
        ) : admins.length === 0 ? (
          <div className="text-center py-12 text-blue-300 text-sm">Nenhum admin encontrado</div>
        ) : admins.map(admin => (
          <motion.div
            key={admin.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <Shield size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{admin.name || '(sem nome)'}</p>
              <p className="text-xs text-blue-300 truncate">{admin.email}</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
              ADMIN
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { setEditAdmin(admin); setEditForm({ name: admin.name ?? '', password: '', confirmPassword: '' }); setEditError('') }}
                className="p-2 rounded-lg text-blue-300 hover:bg-white/10 transition-all"
                title="Editar / alterar senha"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => { setConfirmDelete(admin); setDeleteAccount(false) }}
                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                title="Remover admin"
              >
                <UserMinus size={15} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal — Criar Admin */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl p-6 space-y-4"
              style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-base">Novo Administrador</h3>
                <button onClick={() => setShowCreate(false)} className="text-blue-300 hover:text-white"><X size={18} /></button>
              </div>
              {createError && <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{createError}</p>}
              <div className="space-y-3">
                <input
                  className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Nome (opcional)"
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                />
                <input
                  type="email"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Email *"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                />
                <input
                  type="password"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Senha * (mín. 8 caracteres)"
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                />
                <input
                  type="password"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Confirmar senha *"
                  value={createForm.confirmPassword}
                  onChange={e => setCreateForm(f => ({ ...f, confirmPassword: e.target.value }))}
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                {creating ? 'Criando...' : 'Criar Administrador'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal — Editar Admin */}
      <AnimatePresence>
        {editAdmin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl p-6 space-y-4"
              style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-base">Editar Admin</h3>
                <button onClick={() => setEditAdmin(null)} className="text-blue-300 hover:text-white"><X size={18} /></button>
              </div>
              <p className="text-xs text-blue-300">{editAdmin.email}</p>
              {editError && <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{editError}</p>}
              <div className="space-y-3">
                <input
                  className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Nome"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
                <div className="border-t border-white/10 pt-3">
                  <p className="text-xs text-blue-300 mb-2 flex items-center gap-1"><KeyRound size={12} /> Alterar senha (deixe em branco para não alterar)</p>
                  <input
                    type="password"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300 text-sm focus:outline-none focus:border-blue-400 mb-2"
                    placeholder="Nova senha (mín. 8 caracteres)"
                    value={editForm.password}
                    onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                  />
                  <input
                    type="password"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Confirmar nova senha"
                    value={editForm.confirmPassword}
                    onChange={e => setEditForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  />
                </div>
              </div>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />}
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal — Confirmar remoção */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 space-y-4"
              style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-base">Remover Admin</h3>
                <button onClick={() => setConfirmDelete(null)} className="text-blue-300 hover:text-white"><X size={18} /></button>
              </div>
              <p className="text-sm text-blue-200">
                O que fazer com <span className="text-white font-semibold">{confirmDelete.email}</span>?
              </p>
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" checked={!deleteAccount} onChange={() => setDeleteAccount(false)} className="mt-0.5" />
                  <div>
                    <p className="text-sm text-white font-medium">Rebaixar para usuário comum</p>
                    <p className="text-xs text-blue-300">Mantém a conta, remove apenas o acesso admin</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" checked={deleteAccount} onChange={() => setDeleteAccount(true)} className="mt-0.5" />
                  <div>
                    <p className="text-sm text-red-400 font-medium">Deletar conta permanentemente</p>
                    <p className="text-xs text-blue-300">Remove login e todos os dados</p>
                  </div>
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl bg-white/10 text-blue-200 text-sm font-medium hover:bg-white/20 transition-all">
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {deleting ? 'Removendo...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
