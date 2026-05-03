'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { financeService } from '@/services/finance'
import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types'

const FALLBACK_REVENUE = ['Serviços', 'Consultoria', 'Projetos', 'Vendas', 'Outros']
const FALLBACK_EXPENSE = ['Infraestrutura', 'Material', 'Tecnologia', 'Marketing', 'Impostos', 'Outros']

interface TransactionFormProps {
  type: 'revenue' | 'expense'
  initialData?: Transaction
  onSuccess: (tx: Transaction) => void
  onCancel: () => void
}

export function TransactionForm({ type, initialData, onSuccess, onCancel }: TransactionFormProps) {
  const [form, setForm] = useState({
    description: initialData?.description ?? '',
    value: initialData?.value?.toString() ?? '',
    category: initialData?.category ?? '',
    date: initialData?.date ?? new Date().toISOString().split('T')[0],
    status: (initialData?.status ?? 'completed') as Transaction['status'],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<string[]>(
    type === 'revenue' ? FALLBACK_REVENUE : FALLBACK_EXPENSE
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase
        .from('categories')
        .select('name')
        .eq('user_id', session.user.id)
        .eq('type', type)
        .order('created_at')
        .then(({ data }) => {
          if (data && data.length > 0) {
            const userNames = data.map((c) => c.name)
            const fallback = type === 'revenue' ? FALLBACK_REVENUE : FALLBACK_EXPENSE
            // user categories first, then fallback items not already present
            const merged = [...userNames, ...fallback.filter((f) => !userNames.includes(f))]
            setCategories(merged)
          }
        })
    })
  }, [type])

  const isEditing = !!initialData

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description || !form.value || !form.category) {
      setError('Preencha todos os campos obrigatórios')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const payload = { ...form, value: parseFloat(form.value), type }
      const tx = isEditing
        ? await financeService.updateTransaction(initialData.id, payload)
        : type === 'revenue'
          ? await financeService.createRevenue(payload)
          : await financeService.createExpense(payload)
      onSuccess(tx)
    } catch {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Descrição *</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder={type === 'revenue' ? 'Ex: Serviço para Cliente X' : 'Ex: Conta de Internet'}
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Valor (R$) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            placeholder="0,00"
            className="input-field"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Data *</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Categoria *</label>
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="input-field"
        >
          <option value="">Selecione...</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Status</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as Transaction['status'] })}
          className="input-field"
        >
          <option value="completed">Concluído</option>
          <option value="pending">Pendente</option>
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-outline flex-1">Cancelar</button>
        <button type="submit" disabled={isLoading} className="btn-primary flex-1">
          {isLoading ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : isEditing ? 'Salvar alterações' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
