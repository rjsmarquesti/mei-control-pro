'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Minus,
  FileText,
  Receipt,
  BarChart3,
  Tag,
  Settings,
  X,
  Check,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface QuickAction {
  id: string
  label: string
  icon: typeof Plus
  color: string
  bg: string
  onClick?: () => void
}

export function QuickActions() {
  const { brandSettings } = useAppStore()
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [successAction, setSuccessAction] = useState<string | null>(null)

  const handleAction = async (id: string) => {
    setActiveAction(id)
    await new Promise((r) => setTimeout(r, 600))
    setActiveAction(null)
    setSuccessAction(id)
    setTimeout(() => setSuccessAction(null), 1500)
  }

  const actions: QuickAction[] = [
    {
      id: 'revenue',
      label: 'Nova Receita',
      icon: Plus,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
    {
      id: 'expense',
      label: 'Nova Despesa',
      icon: Minus,
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.1)',
    },
    {
      id: 'irpf',
      label: 'Gerar IRPF',
      icon: FileText,
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.1)',
    },
    {
      id: 'das',
      label: 'Pagar DAS',
      icon: Receipt,
      color: brandSettings.primaryColor,
      bg: `color-mix(in srgb, ${brandSettings.primaryColor} 15%, transparent)`,
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: BarChart3,
      color: '#06B6D4',
      bg: 'rgba(6, 182, 212, 0.1)',
    },
    {
      id: 'categories',
      label: 'Categorias',
      icon: Tag,
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.1)',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass-card p-5"
    >
      <h3 className="text-sm font-bold text-foreground mb-4">Ações Rápidas</h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {actions.map((action, index) => {
          const isActive = activeAction === action.id
          const isSuccess = successAction === action.id

          return (
            <motion.button
              key={action.id}
              onClick={() => handleAction(action.id)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.06 }}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.92 }}
              className="flex flex-col items-center gap-2.5 p-3 rounded-xl transition-all duration-200 group"
              style={{ background: action.bg }}
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200"
                style={{ background: `${action.color}20` }}
              >
                <AnimatePresence mode="wait">
                  {isSuccess ? (
                    <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Check size={18} style={{ color: action.color }} />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div key="loading" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                      <Settings size={18} style={{ color: action.color }} />
                    </motion.div>
                  ) : (
                    <motion.div key="icon" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                      <action.icon size={18} style={{ color: action.color }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className="text-[11px] font-semibold text-foreground text-center leading-tight">
                {action.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
