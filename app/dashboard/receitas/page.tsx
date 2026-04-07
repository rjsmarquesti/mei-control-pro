'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, TrendingUp, ArrowDownLeft, Search, Filter } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from '@/components/forms/TransactionForm'
import { useDashboard } from '@/hooks/useDashboard'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types'

export default function ReceitasPage() {
  const { transactions, isLoading } = useDashboard()
  const { brandSettings, setTransactions } = useAppStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const revenues = transactions.filter((t) => t.type === 'revenue')
  const filtered = revenues.filter((t) =>
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  )

  const total = revenues.reduce((s, t) => s + t.value, 0)
  const completed = revenues.filter((t) => t.status === 'completed').reduce((s, t) => s + t.value, 0)
  const pending = revenues.filter((t) => t.status === 'pending').reduce((s, t) => s + t.value, 0)

  const handleSuccess = (tx: Transaction) => {
    setTransactions([tx, ...transactions])
    setIsModalOpen(false)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Receitas</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{revenues.length} lançamentos encontrados</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <Plus size={16} /> Nova Receita
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <p className="text-xl font-bold" style={{ color }}>{formatCurrency(value)}</p>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-surface">
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar receitas..."
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Table */}
        <TransactionsTable transactions={filtered} isLoading={isLoading} />

        {/* Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Receita">
          <TransactionForm type="revenue" onSuccess={handleSuccess} onCancel={() => setIsModalOpen(false)} />
        </Modal>
      </div>
    </DashboardLayout>
  )
}
