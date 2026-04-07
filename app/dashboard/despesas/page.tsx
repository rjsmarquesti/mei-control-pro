'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, TrendingDown, ArrowUpRight, Search } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from '@/components/forms/TransactionForm'
import { useDashboard } from '@/hooks/useDashboard'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types'

export default function DespesasPage() {
  const { transactions, isLoading } = useDashboard()
  const { setTransactions } = useAppStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const expenses = transactions.filter((t) => t.type === 'expense')
  const filtered = expenses.filter((t) =>
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  )

  const total = expenses.reduce((s, t) => s + t.value, 0)
  const completed = expenses.filter((t) => t.status === 'completed').reduce((s, t) => s + t.value, 0)
  const pending = expenses.filter((t) => t.status === 'pending').reduce((s, t) => s + t.value, 0)

  const handleSuccess = (tx: Transaction) => {
    setTransactions([tx, ...transactions])
    setIsModalOpen(false)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Despesas</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{expenses.length} lançamentos encontrados</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ background: '#EF4444' }}>
            <Plus size={16} /> Nova Despesa
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Despesas', value: total, color: '#EF4444', icon: TrendingDown },
            { label: 'Pago', value: completed, color: '#6B7280', icon: ArrowUpRight },
            { label: 'A Pagar', value: pending, color: '#F59E0B', icon: ArrowUpRight },
          ].map(({ label, value, color, icon: Icon }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
              <p className="text-xl font-bold" style={{ color }}>{formatCurrency(value)}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-surface">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar despesas..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
        </div>

        <TransactionsTable transactions={filtered} isLoading={isLoading} />

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Despesa">
          <TransactionForm type="expense" onSuccess={handleSuccess} onCancel={() => setIsModalOpen(false)} />
        </Modal>
      </div>
    </DashboardLayout>
  )
}
