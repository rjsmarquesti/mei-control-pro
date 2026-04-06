'use client'

import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/SkeletonCard'
import { formatCurrency, formatShortDate } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import type { Transaction } from '@/types'

interface TransactionsTableProps {
  transactions: Transaction[]
  isLoading?: boolean
}

const statusLabels: Record<Transaction['status'], string> = {
  completed: 'Concluído',
  pending: 'Pendente',
  cancelled: 'Cancelado',
}

const categoryColors: Record<string, string> = {
  'Serviços': '#7C3AED',
  'Consultoria': '#06B6D4',
  'Projetos': '#10B981',
  'Infraestrutura': '#F59E0B',
  'Material': '#EF4444',
  'Tecnologia': '#8B5CF6',
  'Outros': '#6B7280',
}

export function TransactionsTable({ transactions, isLoading }: TransactionsTableProps) {
  const { brandSettings } = useAppStore()

  if (isLoading) return <SkeletonTable />

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-card p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-foreground">Últimas Movimentações</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{transactions.length} transações recentes</p>
        </div>
        <button
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors hover:opacity-80"
          style={{ color: brandSettings.primaryColor }}
        >
          Ver todas <ExternalLink size={13} />
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/60">
              {['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Status'].map((h) => (
                <th key={h} className="pb-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider first:pl-0 last:text-right pr-4 last:pr-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {transactions.map((tx, index) => (
              <motion.tr
                key={tx.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-muted/30 transition-colors group"
              >
                <td className="py-3.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                  {formatShortDate(tx.date)}
                </td>
                <td className="py-3.5 pr-4">
                  <Badge variant={tx.type}>
                    {tx.type === 'revenue'
                      ? <><ArrowDownLeft size={10} /> Receita</>
                      : <><ArrowUpRight size={10} /> Despesa</>
                    }
                  </Badge>
                </td>
                <td className="py-3.5 pr-4">
                  <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{tx.description}</p>
                </td>
                <td className="py-3.5 pr-4">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-md"
                    style={{
                      background: `${categoryColors[tx.category] ?? '#6B7280'}18`,
                      color: categoryColors[tx.category] ?? '#6B7280',
                    }}
                  >
                    {tx.category}
                  </span>
                </td>
                <td className="py-3.5 pr-4">
                  <span
                    className={`text-sm font-bold ${tx.type === 'revenue' ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {tx.type === 'revenue' ? '+' : '-'}{formatCurrency(tx.value)}
                  </span>
                </td>
                <td className="py-3.5 text-right">
                  <Badge variant={tx.status}>{statusLabels[tx.status]}</Badge>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden space-y-3">
        {transactions.map((tx, index) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0"
          >
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                tx.type === 'revenue' ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}
            >
              {tx.type === 'revenue'
                ? <ArrowDownLeft size={16} className="text-emerald-400" />
                : <ArrowUpRight size={16} className="text-red-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
              <p className="text-xs text-muted-foreground">{formatShortDate(tx.date)} · {tx.category}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold ${tx.type === 'revenue' ? 'text-emerald-400' : 'text-red-400'}`}>
                {tx.type === 'revenue' ? '+' : '-'}{formatCurrency(tx.value)}
              </p>
              <Badge variant={tx.status} className="mt-0.5">{statusLabels[tx.status]}</Badge>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
