'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Tag, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PlanGate } from '@/components/plan/PlanGate'
import { supabase } from '@/lib/supabase'

const DEFAULT_COLORS = ['#7C3AED','#06B6D4','#10B981','#F59E0B','#EF4444','#EC4899','#8B5CF6','#14B8A6']

interface Category { id: string; name: string; type: 'revenue' | 'expense'; color: string }

interface CategoryListProps {
  items: Category[]
  editingId: string | null
  editName: string
  onEditStart: (cat: Category) => void
  onEditChange: (name: string) => void
  onEditSave: (id: string) => void
  onEditCancel: () => void
  onDelete: (id: string) => void
}

function CategoryList({ items, editingId, editName, onEditStart, onEditChange, onEditSave, onEditCancel, onDelete }: CategoryListProps) {
  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma categoria ainda</p>
      )}
      <AnimatePresence>
        {items.map((cat) => (
          <motion.div key={cat.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
            className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors group">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cat.color}20` }}>
              <Tag size={14} style={{ color: cat.color }} />
            </div>
            {editingId === cat.id ? (
              <input autoFocus value={editName} onChange={(e) => onEditChange(e.target.value)} className="input-field flex-1 py-1.5 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') onEditSave(cat.id); if (e.key === 'Escape') onEditCancel() }} />
            ) : (
              <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
            )}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingId === cat.id ? (
                <>
                  <button onClick={() => onEditSave(cat.id)} className="btn-ghost !p-1.5 !rounded-lg text-emerald-400"><Check size={14} /></button>
                  <button onClick={onEditCancel} className="btn-ghost !p-1.5 !rounded-lg text-red-400"><X size={14} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => onEditStart(cat)} className="btn-ghost !p-1.5 !rounded-lg"><Pencil size={14} /></button>
                  <button onClick={() => onDelete(cat.id)} className="btn-ghost !p-1.5 !rounded-lg text-red-400"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'revenue' | 'expense'>('revenue')
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0])
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUserId(session.user.id)
      const { data } = await supabase
        .from('categories')
        .select('id,name,type,color')
        .eq('user_id', session.user.id)
        .order('created_at')
      setCategories(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const handleAdd = async () => {
    if (!newName.trim() || !userId) return
    setAdding(true)
    setAddError('')
    const { data, error } = await supabase.from('categories').insert({
      user_id: userId,
      name: newName.trim(),
      type: newType,
      color: newColor,
    }).select().single()
    if (error) {
      setAddError('Erro ao salvar categoria. Tente novamente.')
    } else if (data) {
      setCategories([...categories, data])
      setNewName('')
    }
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id)
    setCategories(categories.filter((c) => c.id !== id))
  }

  const handleEditSave = async (id: string) => {
    await supabase.from('categories').update({ name: editName }).eq('id', id)
    setCategories(categories.map((c) => c.id === id ? { ...c, name: editName } : c))
    setEditingId(null)
  }

  const revenues = categories.filter((c) => c.type === 'revenue')
  const expenses = categories.filter((c) => c.type === 'expense')

  const listProps = {
    editingId,
    editName,
    onEditStart: (cat: Category) => { setEditingId(cat.id); setEditName(cat.name) },
    onEditChange: setEditName,
    onEditSave: handleEditSave,
    onEditCancel: () => setEditingId(null),
    onDelete: handleDelete,
  }

  return (
    <DashboardLayout>
      <PlanGate requiredPlan="basic" featureName="Categorias">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Categorias</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Organize suas receitas e despesas por categoria</p>
          </div>

          {/* Add form */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">Nova Categoria</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Nome</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Freelance" className="input-field"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Tipo</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value as 'revenue' | 'expense')} className="input-field">
                  <option value="revenue">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Cor</label>
                <div className="flex gap-1.5">
                  {DEFAULT_COLORS.map((c) => (
                    <button key={c} onClick={() => setNewColor(c)} className="h-7 w-7 rounded-lg border-2 transition-all"
                      style={{ background: c, borderColor: newColor === c ? 'white' : 'transparent' }} />
                  ))}
                </div>
              </div>
              <button onClick={handleAdd} disabled={adding || !newName.trim()} className="btn-primary gap-2 shrink-0">
                {adding ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Plus size={15} /> Adicionar</>}
              </button>
            </div>
            {addError && <p className="text-xs text-red-400 mt-2">{addError}</p>}
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="glass-card p-6 h-48 animate-pulse" />
              <div className="glass-card p-6 h-48 animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" /> Categorias de Receita ({revenues.length})
                </h3>
                <CategoryList items={revenues} {...listProps} />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-400" /> Categorias de Despesa ({expenses.length})
                </h3>
                <CategoryList items={expenses} {...listProps} />
              </motion.div>
            </div>
          )}
        </div>
      </PlanGate>
    </DashboardLayout>
  )
}
