'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, FileText, Receipt, BarChart3, Tag, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { usePlan } from '@/hooks/usePlan'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from '@/components/forms/TransactionForm'
import type { Transaction } from '@/types'
import type { Plan } from '@/lib/plans'

interface QuickAction {
  id: string
  label: string
  icon: any
  color: string
  bg: string
  requiredPlan: Plan
  href?: string
  modal?: 'revenue' | 'expense'
}

export function QuickActions() {
  const { brandSettings, transactions, setTransactions } = useAppStore()
  const { hasAccess } = usePlan()
  const router = useRouter()
  const [modalType, setModalType] = useState<'revenue' | 'expense' | null>(null)

  const actions: QuickAction[] = [
    {
      id: 'revenue',
      label: 'Nova Receita',
      icon: Plus,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.1)',
      requiredPlan: 'free',
      modal: 'revenue',
    },
    {
      id: 'expense',
      label: 'Nova Despesa',
      icon: Minus,
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      requiredPlan: 'free',
      modal: 'expense',
    },
    {
      id: 'das',
      label: 'Pagar DAS',
      icon: Receipt,
      color: brandSettings.primaryColor,
      bg: `color-mix(in srgb, ${brandSettings.primaryColor} 15%, transparent)`,
      requiredPlan: 'pro',
      href: '/dashboard/das',
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: BarChart3,
      color: '#06B6D4',
      bg: 'rgba(6, 182, 212, 0.1)',
      requiredPlan: 'pro',
      href: '/dashboard/relatorios',
    },
    {
      id: 'irpf',
      label: 'Gerar IRPF',
      icon: FileText,
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.1)',
      requiredPlan: 'premium',
      href: '/dashboard/irpf',
    },
    {
      id: 'categories',
      label: 'Categorias',
      icon: Tag,
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.1)',
      requiredPlan: 'basic',
      href: '/dashboard/categorias',
    },
  ]

  const handleClick = (action: QuickAction) => {
    if (!hasAccess(action.requiredPlan)) {
      router.push('/dashboard/assinatura')
      return
    }
    if (action.modal) {
      setModalType(action.modal)
    } else if (action.href) {
      router.push(action.href)
    }
  }

  const handleTransactionSuccess = (tx: Transaction) => {
    setTransactions([tx, ...transactions])
    setModalType(null)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="glass-card p-5"
      >
        <h3 className="text-sm font-bold text-foreground mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {actions.map((action, index) => {
            const allowed = hasAccess(action.requiredPlan)

            return (
              <motion.button
                key={action.id}
                onClick={() => handleClick(action)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.06 }}
                whileHover={{ y: -3, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.92 }}
                className="flex flex-col items-center gap-2.5 p-3 rounded-xl transition-all duration-200 relative"
                style={{ background: allowed ? action.bg : 'rgba(107,114,128,0.08)' }}
              >
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{ background: allowed ? `${action.color}20` : 'rgba(107,114,128,0.15)' }}
                >
                  {allowed ? (
                    <action.icon size={18} style={{ color: action.color }} />
                  ) : (
                    <Lock size={15} className="text-muted-foreground/60" />
                  )}
                </div>
                <span className={`text-[11px] font-semibold text-center leading-tight ${allowed ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                  {action.label}
                </span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Modal Nova Receita / Nova Despesa */}
      <Modal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        title={modalType === 'revenue' ? 'Nova Receita' : 'Nova Despesa'}
        size="md"
      >
        {modalType && (
          <TransactionForm
            type={modalType}
            onSuccess={handleTransactionSuccess}
            onCancel={() => setModalType(null)}
          />
        )}
      </Modal>
    </>
  )
}
