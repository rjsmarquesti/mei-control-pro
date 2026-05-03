'use client'

import { motion } from 'framer-motion'
import { Receipt, Calendar, ExternalLink } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { Skeleton } from '@/components/ui/SkeletonCard'

const DAS_GOV_URL = 'https://www.gov.br/pt-br/servicos/emitir-das-para-pagamento-de-tributos-do-mei'

interface DASCardProps {
  value: number
  dueDate: string
  isLoading?: boolean
}

export function DASCard({ value, dueDate, isLoading }: DASCardProps) {
  const { brandSettings } = useAppStore()

  const hasDueDate = !!dueDate
  const dueDateObj = hasDueDate ? new Date(dueDate + 'T00:00:00') : null
  const today = new Date()
  const daysUntilDue = dueDateObj ? Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0
  const isUrgent = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 5

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
        {(isOverdue || isUrgent) && (
          <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-lg ${isOverdue ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
            {isOverdue ? 'Vencido' : `${daysUntilDue}d`}
          </span>
        )}
      </div>

      <>
        <p className="text-3xl font-bold text-foreground tracking-tight mb-1">
          {formatCurrency(value)}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <Calendar size={12} />
          <span>{hasDueDate ? `Vencimento: ${formatDate(dueDate)}` : 'Sem DAS pendente'}</span>
        </div>

        <a
          href={DAS_GOV_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-95 hover:opacity-90"
          style={{
            background: `linear-gradient(135deg, ${brandSettings.primaryColor}, color-mix(in srgb, ${brandSettings.primaryColor} 70%, #06B6D4))`,
            boxShadow: `0 4px 16px color-mix(in srgb, ${brandSettings.primaryColor} 35%, transparent)`,
          }}
        >
          Emitir DAS no gov.br <ExternalLink size={14} />
        </a>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          O pagamento é feito diretamente no portal oficial
        </p>
      </>
    </motion.div>
  )
}
