'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { financeService } from '@/services/finance'
import type { Transaction } from '@/types'

const CATEGORIES_REVENUE = ['Serviços', 'Consultoria', 'Projetos', 'Vendas', 'Outros']
const CATEGORIES_EXPENSE = ['Infraestrutura', 'Material', 'Tecnologia', 'Marketing', 'Impostos', 'Outros']

interface TransactionFormProps {
  type: 'revenue' | 'expense'
  onSuccess: (tx: Transaction) => void
  onCancel: () => void
}

export function TransactionForm({ type, onSuccess, onCancel }: TransactionFormProps) {
  const [form, setForm] = useState({
    description: '',
    value: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    status: 'completed' as Transaction['status'],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const categories = type === 'revenue' ? CATEGORIES_REVENUE : CATEGORIES_EXPENSE

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
      const tx = type === 'revenue'
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
          {isLoading ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
