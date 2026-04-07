'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Tag, Pencil, Trash2, Check, X } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAppStore } from '@/store/useAppStore'
import { useDashboard } from '@/hooks/useDashboard'

const DEFAULT_COLORS = ['#7C3AED','#06B6D4','#10B981','#F59E0B','#EF4444','#EC4899','#8B5CF6','#14B8A6']

interface Category { id: string; name: string; type: 'revenue' | 'expense'; color: string; count: number }

const initialCategories: Category[] = [
  { id: '1', name: 'Serviços', type: 'revenue', color: '#7C3AED', count: 12 },
  { id: '2', name: 'Consultoria', type: 'revenue', color: '#06B6D4', count: 8 },
  { id: '3', name: 'Projetos', type: 'revenue', color: '#10B981', count: 5 },
  { id: '4', name: 'Infraestrutura', type: 'expense', color: '#F59E0B', count: 4 },
  { id: '5', name: 'Tecnologia', type: 'expense', color: '#8B5CF6', count: 6 },
  { id: '6', name: 'Material', type: 'expense', color: '#EF4444', count: 3 },
]

export default function CategoriasPage() {
  const { brandSettings } = useAppStore()
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'revenue' | 'expense'>('revenue')
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const revenues = categories.filter((c) => c.type === 'revenue')
  const expenses = categories.filter((c) => c.type === 'expense')

  const handleAdd = () => {
    if (!newName.trim()) return
    setCategories([...categories, { id: Date.now().toString(), name: newName.trim(), type: newType, color: newColor, count: 0 }])
    setNewName('')
  }

  const handleDelete = (id: string) => setCategories(categories.filter((c) => c.id !== id))

  const handleEditSave = (id: string) => {
    setCategories(categories.map((c) => c.id === id ? { ...c, name: editName } : c))
    setEditingId(null)
  }

  const CategoryList = ({ items }: { items: Category[] }) => (
    <div className="space-y-2">
      <AnimatePresence>
        {items.map((cat) => (
          <motion.div key={cat.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
            className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors group">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cat.color}20` }}>
              <Tag size={14} style={{ color: cat.color }} />
            </div>
            {editingId === cat.id ? (
              <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field flex-1 py-1.5 text-sm" onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(cat.id); if (e.key === 'Escape') setEditingId(null) }} />
            ) : (
              <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
            )}
            <span className="text-xs text-muted-foreground">{cat.count} lançamentos</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingId === cat.id ? (
                <>
                  <button onClick={() => handleEditSave(cat.id)} className="btn-ghost !p-1.5 !rounded-lg text-emerald-400"><Check size={14} /></button>
                  <button onClick={() => setEditingId(null)} className="btn-ghost !p-1.5 !rounded-lg text-red-400"><X size={14} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditingId(cat.id); setEditName(cat.name) }} className="btn-ghost !p-1.5 !rounded-lg"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(cat.id)} className="btn-ghost !p-1.5 !rounded-lg text-red-400"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  return (
    <DashboardLayout>
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
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Freelance" className="input-field" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
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
                  <button key={c} onClick={() => setNewColor(c)} className="h-7 w-7 rounded-lg border-2 transition-all" style={{ background: c, borderColor: newColor === c ? 'white' : 'transparent' }} />
                ))}
              </div>
            </div>
            <button onClick={handleAdd} className="btn-primary gap-2 shrink-0"><Plus size={15} /> Adicionar</button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" /> Categorias de Receita ({revenues.length})
            </h3>
            <CategoryList items={revenues} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-400" /> Categorias de Despesa ({expenses.length})
            </h3>
            <CategoryList items={expenses} />
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}
