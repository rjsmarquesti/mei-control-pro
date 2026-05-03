'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw, Search, Phone, MapPin, Mail, MessageSquare,
  User, Users, Target, Plus, X, Trash2, Send, ChevronDown,
  Headphones, CheckCircle2, Clock, AlertTriangle, Star
} from 'lucide-react'
import { useAdmin } from '@/hooks/useAdmin'

interface Contact {
  id: string
  type: 'user' | 'lead'
  name: string
  email: string
  phone: string
  city: string
  status: string
  subscription_plan: string | null
  notes?: string
  created_at: string
  updated_at: string
}

interface CrmNote {
  id: string
  contact_id: string
  contact_type: string
  content: string
  interaction_type: string
  created_at: string
}

const INTERACTION_TYPES = [
  { value: 'note', label: 'Nota', icon: MessageSquare, color: 'text-slate-400' },
  { value: 'call', label: 'Ligação', icon: Phone, color: 'text-green-400' },
  { value: 'email', label: 'Email', icon: Mail, color: 'text-blue-400' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400' },
  { value: 'support', label: 'Suporte', icon: Headphones, color: 'text-violet-400' },
]

const planColor = (p: string | null) => {
  if (p === 'premium') return 'bg-amber-500/20 text-amber-400'
  if (p === 'pro') return 'bg-violet-500/20 text-violet-400'
  if (p === 'basic') return 'bg-blue-500/20 text-blue-400'
  return 'bg-slate-700/50 text-slate-400'
}

const statusColor = (s: string) => {
  if (s === 'active') return 'bg-green-500/20 text-green-400'
  if (s === 'novo') return 'bg-violet-500/20 text-violet-400'
  if (s === 'contatado') return 'bg-blue-500/20 text-blue-400'
  if (s === 'perdido') return 'bg-red-500/20 text-red-400'
  if (s === 'blocked') return 'bg-red-500/20 text-red-400'
  if (s === 'suspended') return 'bg-amber-500/20 text-amber-400'
  return 'bg-slate-700/50 text-slate-400'
}

const statusLabel = (s: string, type: string) => {
  if (type === 'user') {
    if (s === 'active') return 'Ativo'
    if (s === 'blocked') return 'Bloqueado'
    if (s === 'suspended') return 'Suspenso'
  }
  if (s === 'novo') return 'Novo'
  if (s === 'contatado') return 'Contatado'
  if (s === 'perdido') return 'Perdido'
  return s
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function CRMPage() {
  const { isAdmin, loading, token } = useAdmin()
  const af = (url: string, init?: RequestInit) =>
    fetch(url, { ...init, headers: { ...(init?.headers as object), Authorization: `Bearer ${token ?? ''}` } })
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filtered, setFiltered] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'user' | 'lead'>('all')
  const [loadingData, setLoadingData] = useState(true)
  const [selected, setSelected] = useState<Contact | null>(null)
  const [notes, setNotes] = useState<CrmNote[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('note')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => { if (isAdmin && token) loadContacts() }, [isAdmin, token])

  useEffect(() => {
    let result = contacts
    if (filterType !== 'all') result = result.filter(c => c.type === filterType)
    const q = search.toLowerCase()
    if (q) result = result.filter(c =>
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q) ||
      (c.city ?? '').toLowerCase().includes(q)
    )
    setFiltered(result)
  }, [search, contacts, filterType])

  const loadContacts = async () => {
    setLoadingData(true)
    try {
      const data = await af('/api/admin/crm/contacts').then(r => r.json())
      setContacts(Array.isArray(data) ? data : [])
    } finally {
      setLoadingData(false)
    }
  }

  const selectContact = async (c: Contact) => {
    setSelected(c)
    setLoadingNotes(true)
    const data = await af(`/api/admin/crm/notes?contact_id=${c.id}`).then(r => r.json())
    setNotes(Array.isArray(data) ? data : [])
    setLoadingNotes(false)
  }

  const addNote = async () => {
    if (!newNote.trim() || !selected) return
    setSavingNote(true)
    const data = await af('/api/admin/crm/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: selected.id, contact_type: selected.type, content: newNote, interaction_type: noteType }),
    }).then(r => r.json())
    if (data.id) setNotes(prev => [data, ...prev])
    setNewNote('')
    setSavingNote(false)
  }

  const deleteNote = async (id: string) => {
    await af('/api/admin/crm/notes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const openWhatsApp = (phone: string) => {
    const num = phone.replace(/\D/g, '')
    const wa = num.length === 11 ? '55' + num : num
    window.open(`https://wa.me/${wa}`, '_blank')
  }

  const totalUsers = contacts.filter(c => c.type === 'user').length
  const totalLeads = contacts.filter(c => c.type === 'lead').length
  const paidUsers = contacts.filter(c => c.subscription_plan && c.subscription_plan !== 'free').length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin text-blue-400" />
    </div>
  )

  return (
    <div className="flex h-full gap-4">
      {/* Left — contacts list */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">CRM / Suporte</h1>
            <p className="text-xs text-slate-400 mt-0.5">{contacts.length} contatos · {totalUsers} clientes · {totalLeads} leads · {paidUsers} pagantes</p>
          </div>
          <button onClick={loadContacts} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'user', 'lead'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterType === t ? 'bg-blue-600 text-white' : 'border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              {t === 'all' ? 'Todos' : t === 'user' ? 'Clientes' : 'Leads'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email, telefone ou cidade..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Contacts */}
        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
          {loadingData && <div className="text-center py-12"><RefreshCw size={20} className="animate-spin mx-auto text-slate-500" /></div>}
          {!loadingData && filtered.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-slate-500 text-xs">Nenhum contato encontrado</div>
          )}
          {filtered.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => selectContact(c)}
              className={`rounded-2xl border p-4 cursor-pointer transition-all ${selected?.id === c.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 bg-slate-900/60 hover:border-white/20'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${c.type === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-violet-500/20 text-violet-400'}`}>
                    {(c.name || c.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white text-sm truncate">{c.name || 'Sem nome'}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.type === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-violet-500/20 text-violet-400'}`}>
                        {c.type === 'user' ? 'Cliente' : 'Lead'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(c.status)}`}>
                        {statusLabel(c.status, c.type)}
                      </span>
                      {c.subscription_plan && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${planColor(c.subscription_plan)}`}>
                          {c.subscription_plan.charAt(0).toUpperCase() + c.subscription_plan.slice(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{c.email}</p>
                    <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                      {c.phone && <span className="flex items-center gap-1"><Phone size={10} />{c.phone}</span>}
                      {c.city && <span className="flex items-center gap-1"><MapPin size={10} />{c.city}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {c.phone && (
                    <button
                      onClick={e => { e.stopPropagation(); openWhatsApp(c.phone) }}
                      className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-all"
                      title="WhatsApp"
                    >
                      <MessageSquare size={13} />
                    </button>
                  )}
                  <a
                    href={`mailto:${c.email}`}
                    onClick={e => e.stopPropagation()}
                    className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-all"
                    title="Email"
                  >
                    <Mail size={13} />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right — contact detail + notes */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className="w-80 shrink-0 flex flex-col gap-4"
          >
            {/* Contact info */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${selected.type === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-violet-500/20 text-violet-400'}`}>
                    {(selected.name || selected.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{selected.name || 'Sem nome'}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${selected.type === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-violet-500/20 text-violet-400'}`}>
                      {selected.type === 'user' ? 'Cliente' : 'Lead'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2"><Mail size={11} /><span className="truncate">{selected.email}</span></div>
                {selected.phone && <div className="flex items-center gap-2"><Phone size={11} />{selected.phone}</div>}
                {selected.city && <div className="flex items-center gap-2"><MapPin size={11} />{selected.city}</div>}
                {selected.subscription_plan && (
                  <div className="flex items-center gap-2">
                    <Star size={11} />
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${planColor(selected.subscription_plan)}`}>
                      {selected.subscription_plan.charAt(0).toUpperCase() + selected.subscription_plan.slice(1)}
                    </span>
                  </div>
                )}
                <div className="text-slate-500 pt-1">Cadastro: {formatDate(selected.created_at)}</div>
              </div>
              {/* Quick actions */}
              <div className="flex gap-2 mt-3">
                {selected.phone && (
                  <button
                    onClick={() => openWhatsApp(selected.phone)}
                    className="flex-1 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-1"
                  >
                    <MessageSquare size={12} /> WhatsApp
                  </button>
                )}
                <a
                  href={`mailto:${selected.email}`}
                  className="flex-1 py-2 rounded-xl bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30 transition-all flex items-center justify-center gap-1"
                >
                  <Mail size={12} /> Email
                </a>
              </div>
            </div>

            {/* Notes / Interactions */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex flex-col flex-1">
              <p className="text-xs font-bold text-white mb-3">Histórico de Interações</p>

              {/* Add note */}
              <div className="mb-3 space-y-2">
                <div className="flex gap-1 flex-wrap">
                  {INTERACTION_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setNoteType(t.value)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 ${noteType === t.value ? 'bg-blue-600 text-white' : 'border border-white/10 text-slate-400 hover:text-white'}`}
                    >
                      <t.icon size={9} />
                      {t.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Registrar interação, observação ou suporte..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50 resize-none"
                />
                <button
                  onClick={addNote}
                  disabled={savingNote || !newNote.trim()}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1"
                >
                  {savingNote ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                  Registrar
                </button>
              </div>

              {/* Notes list */}
              <div className="space-y-2 overflow-y-auto max-h-64">
                {loadingNotes && <div className="text-center py-4"><RefreshCw size={14} className="animate-spin mx-auto text-slate-500" /></div>}
                {!loadingNotes && notes.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">Nenhuma interação registrada</p>
                )}
                {notes.map(n => {
                  const it = INTERACTION_TYPES.find(t => t.value === n.interaction_type)
                  return (
                    <div key={n.id} className="rounded-xl bg-slate-800/60 border border-white/5 p-3 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          {it && <it.icon size={10} className={it.color} />}
                          <span className={`text-[10px] font-medium ${it?.color ?? 'text-slate-400'}`}>{it?.label ?? n.interaction_type}</span>
                          <span className="text-[10px] text-slate-500">· {formatDate(n.created_at)}</span>
                        </div>
                        <button
                          onClick={() => deleteNote(n.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{n.content}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
