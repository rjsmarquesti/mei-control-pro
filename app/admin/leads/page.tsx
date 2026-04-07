'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Search, Phone, MapPin, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/hooks/useAdmin'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  city: string
  status: string
  notes: string | null
  created_at: string
}

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo', color: 'bg-violet-500/20 text-violet-400' },
  { value: 'contatado', label: 'Contatado', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'convertido', label: 'Convertido', color: 'bg-green-500/20 text-green-400' },
  { value: 'perdido', label: 'Perdido', color: 'bg-red-500/20 text-red-400' },
]

const statusStyle = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.color ?? 'bg-slate-700/50 text-slate-400'
const statusLabel = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label ?? s

export default function LeadsAdminPage() {
  const { isAdmin, loading } = useAdmin()
  const [leads, setLeads] = useState<Lead[]>([])
  const [filtered, setFiltered] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loadingData, setLoadingData] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState<{ id: string; notes: string } | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    loadLeads()
  }, [isAdmin])

  useEffect(() => {
    let result = leads
    if (filterStatus !== 'all') result = result.filter(l => l.status === filterStatus)
    const q = search.toLowerCase()
    if (q) result = result.filter(l =>
      (l.name ?? '').toLowerCase().includes(q) ||
      (l.email ?? '').toLowerCase().includes(q) ||
      (l.phone ?? '').toLowerCase().includes(q) ||
      (l.city ?? '').toLowerCase().includes(q)
    )
    setFiltered(result)
  }, [search, leads, filterStatus])

  const loadLeads = async () => {
    setLoadingData(true)
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    setLeads(data ?? [])
    setFiltered(data ?? [])
    setLoadingData(false)
  }

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id)
    await supabase.from('leads').update({ status }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    setActionLoading(null)
  }

  const saveNotes = async () => {
    if (!editNotes) return
    await supabase.from('leads').update({ notes: editNotes.notes }).eq('id', editNotes.id)
    setLeads(prev => prev.map(l => l.id === editNotes.id ? { ...l, notes: editNotes.notes } : l))
    setEditNotes(null)
  }

  const deleteLead = async (id: string) => {
    if (!confirm('Remover este lead?')) return
    await supabase.from('leads').delete().eq('id', id)
    setLeads(prev => prev.filter(l => l.id !== id))
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin text-blue-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Leads</h1>
          <p className="text-sm text-slate-400 mt-0.5">{leads.length} lead{leads.length !== 1 ? 's' : ''} capturado{leads.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={loadLeads}
          className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_OPTIONS.map(opt => {
          const count = leads.filter(l => l.status === opt.value).length
          return (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(filterStatus === opt.value ? 'all' : opt.value)}
              className={`rounded-xl border p-3 text-left transition-all ${filterStatus === opt.value ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 bg-slate-900/60'}`}
            >
              <p className="text-xs text-slate-400 mb-1">{opt.label}</p>
              <p className="text-xl font-bold text-white">{count}</p>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, email, telefone ou cidade..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Leads */}
      <div className="space-y-3">
        {loadingData && (
          <div className="text-center py-12">
            <RefreshCw size={20} className="animate-spin mx-auto text-slate-500" />
          </div>
        )}
        {!loadingData && filtered.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-slate-500 text-xs">
            Nenhum lead encontrado
          </div>
        )}
        {filtered.map((l, i) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-white">{l.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyle(l.status)}`}>
                    {statusLabel(l.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{l.email}</p>
                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Phone size={11} />{l.phone}</span>
                  <span className="flex items-center gap-1"><MapPin size={11} />{l.city}</span>
                  <span className="text-slate-500">{formatDate(l.created_at)}</span>
                </div>
                {l.notes && (
                  <p className="text-xs text-slate-400 mt-2 italic border-t border-white/5 pt-2">{l.notes}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <select
                  value={l.status}
                  onChange={e => updateStatus(l.id, e.target.value)}
                  disabled={actionLoading === l.id}
                  className="text-xs px-2 py-1 rounded-lg bg-slate-800 border border-white/10 text-slate-300 outline-none cursor-pointer"
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditNotes({ id: l.id, notes: l.notes ?? '' })}
                    className="text-[10px] px-2 py-1 rounded-lg hover:bg-white/10 text-slate-400 transition-all"
                  >
                    Notas
                  </button>
                  <button
                    onClick={() => deleteLead(l.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Notes modal */}
      {editNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Notas do lead</h3>
            <textarea
              value={editNotes.notes}
              onChange={e => setEditNotes({ ...editNotes, notes: e.target.value })}
              rows={4}
              placeholder="Observações, histórico de contato..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditNotes(null)}
                className="flex-1 py-2 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={saveNotes}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
