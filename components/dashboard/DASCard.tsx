'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Receipt, Calendar, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { Skeleton } from '@/components/ui/SkeletonCard'

interface DASCardProps {
  value: number
  dueDate: string
  isLoading?: boolean
}

export function DASCard({ value, dueDate, isLoading }: DASCardProps) {
  const { brandSettings } = useAppStore()
  const [isPaying, setIsPaying] = useState(false)
  const [isPaid, setIsPaid] = useState(false)

  const hasDueDate = !!dueDate
  const dueDateObj = hasDueDate ? new Date(dueDate + 'T00:00:00') : null
  const today = new Date()
  const daysUntilDue = dueDateObj ? Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0
  const isUrgent = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 5

  const handlePay = async () => {
    setIsPaying(true)
    await new Promise((r) => setTimeout(r, 1500))
    setIsPaying(false)
    setIsPaid(true)
  }

  if (isLoading) {
    return (
      <div className="glass-card p-5 space-y-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.32 }}
      className="glass-card p-5 relative overflow-hidden"
    >
      {/* Background gradient accent */}
      <div
        className="absolute top-0 right-0 h-24 w-24 rounded-full opacity-10 -translate-y-8 translate-x-8 pointer-events-none"
        style={{ background: brandSettings.primaryColor, filter: 'blur(24px)' }}
      />

      <div className="flex items-center gap-2 mb-4">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: `color-mix(in srgb, ${brandSettings.primaryColor} 15%, transparent)` }}
        >
          <Receipt size={16} style={{ color: brandSettings.primaryColor }} />
        </div>
        <span className="text-sm font-bold text-foreground">Próximo DAS</span>
        {(isOverdue || isUrgent) && !isPaid && (
          <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-lg ${isOverdue ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
            {isOverdue ? 'Vencido' : `${daysUntilDue}d`}
          </span>
        )}
        {isPaid && (
          <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400">
            Pago ✓
          </span>
        )}
      </div>

      {isPaid ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-3 gap-2"
        >
          <CheckCircle2 size={36} className="text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-400">DAS pago com sucesso!</p>
        </motion.div>
      ) : (
        <>
          <p className="text-3xl font-bold text-foreground tracking-tight mb-1">
            {formatCurrency(value)}
          </p>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
            <Calendar size={12} />
            <span>{hasDueDate ? `Vencimento: ${formatDate(dueDate)}` : 'Sem DAS pendente'}</span>
          </div>

          <button
            onClick={handlePay}
            disabled={isPaying}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-70"
            style={{
              background: `linear-gradient(135deg, ${brandSettings.primaryColor}, color-mix(in srgb, ${brandSettings.primaryColor} 70%, #06B6D4))`,
              boxShadow: `0 4px 16px color-mix(in srgb, ${brandSettings.primaryColor} 35%, transparent)`,
            }}
          >
            {isPaying ? (
              <><Loader2 size={15} className="animate-spin" /> Processando...</>
            ) : (
              <>Pagar agora <ArrowRight size={15} /></>
            )}
          </button>
        </>
      )}
    </motion.div>
  )
}
