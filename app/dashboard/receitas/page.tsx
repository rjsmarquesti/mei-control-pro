'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, TrendingUp, ArrowDownLeft, Search, Printer } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from '@/components/forms/TransactionForm'
import { PrintSection } from '@/components/ui/PrintSection'
import { useDashboard } from '@/hooks/useDashboard'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency } from '@/lib/utils'
import { financeService } from '@/services/finance'
import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types'

interface Profile { name?: string; email?: string; cnpj?: string; city?: string }

export default function ReceitasPage() {
  const { transactions, isLoading } = useDashboard()
  const { setTransactions, setMetrics, bumpRefresh } = useAppStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase.from('profiles').select('name,email,cnpj,city').eq('id', session.user.id).single()
        .then(({ data }) => { if (data) setProfile(data) })
    })
  }, [])

  const revenues = transactions.filter((t) => t.type === 'revenue')
  const filtered = revenues.filter((t) =>
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  )

  const total = revenues.reduce((s, t) => s + t.value, 0)
  const completed = revenues.filter((t) => t.status === 'completed').reduce((s, t) => s + t.value, 0)
  const pending = revenues.filter((t) => t.status === 'pending').reduce((s, t) => s + t.value, 0)

  const handleSuccess = (tx: Transaction) => {
    if (editingTx) {
      setTransactions(transactions.map((t) => t.id === tx.id ? tx : t))
      setEditingTx(null)
    } else {
      setTransactions([tx, ...transactions])
      setIsModalOpen(false)
    }
    financeService.getDashboard().then(setMetrics)
    bumpRefresh()
  }

  const handleDelete = async (tx: Transaction) => {
    if (!confirm(`Excluir "${tx.description}" (${formatCurrency(tx.value)})?`)) return
    try {
      await financeService.deleteTransaction(tx.id)
      setTransactions(transactions.filter((t) => t.id !== tx.id))
      bumpRefresh()
    } catch {
      alert('Erro ao excluir. Tente novamente.')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 no-print">
          <div>
            <h2 className="text-xl font-bold text-foreground">Receitas</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{revenues.length} lançamentos encontrados</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-outline gap-2 text-sm">
              <Printer size={15} /> Imprimir Extrato
            </button>
            <button onClick={() => setIsModalOpen(true)} className="btn-primary">
              <Plus size={16} /> Nova Receita
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
          {[
            { label: 'Total Receitas', value: total, color: '#10B981', icon: TrendingUp },
            { label: 'Recebido', value: completed, color: '#06B6D4', icon: ArrowDownLeft },
            { label: 'A Receber', value: pending, color: '#F59E0B', icon: ArrowDownLeft },
          ].map(({ label, value, color, icon: Icon }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
              <p className="text-lg font-bold truncate" style={{ color }}>{formatCurrency(value)}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-surface no-print">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar receitas..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
        </div>

        <PrintSection id="receitas-print" title="Extrato de Receitas" profile={profile}>
          <TransactionsTable
            transactions={filtered}
            isLoading={isLoading}
            onEdit={(tx) => setEditingTx(tx)}
            onDelete={handleDelete}
          />
        </PrintSection>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Receita">
          <TransactionForm type="revenue" onSuccess={handleSuccess} onCancel={() => setIsModalOpen(false)} />
        </Modal>

        <Modal isOpen={!!editingTx} onClose={() => setEditingTx(null)} title="Editar Receita">
          {editingTx && (
            <TransactionForm
              type="revenue"
              initialData={editingTx}
              onSuccess={handleSuccess}
              onCancel={() => setEditingTx(null)}
            />
          )}
        </Modal>
      </div>
    </DashboardLayout>
  )
}
