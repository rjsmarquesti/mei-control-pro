'use client'

import { motion } from 'framer-motion'
import { Lock, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { type Plan, getPlanConfig, hasAccess } from '@/lib/plans'
import { usePlan } from '@/hooks/usePlan'

interface PlanGateProps {
  requiredPlan: Plan
  children: React.ReactNode
  featureName?: string
}

export function PlanGate({ requiredPlan, children, featureName }: PlanGateProps) {
  const { plan, loading } = usePlan()

  if (loading) return null

  if (hasAccess(plan, requiredPlan)) {
    return <>{children}</>
  }

  const required = getPlanConfig(requiredPlan)
  const current = getPlanConfig(plan)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
    >
      <div
        className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: `${required.color}18` }}
      >
        <Lock size={28} style={{ color: required.color }} />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2">
        {featureName ?? 'Recurso exclusivo'}
      </h2>

      <p className="text-sm text-muted-foreground mb-1 max-w-sm">
        Você está no plano <strong>{current.name}</strong>. Este recurso requer o plano{' '}
        <strong style={{ color: required.color }}>{required.name}</strong> ou superior.
      </p>

      <div className="my-6 p-4 rounded-2xl border max-w-sm w-full text-left space-y-2"
        style={{ borderColor: `${required.color}30`, background: `${required.color}08` }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: required.color }}>
          Plano {required.name} inclui:
        </p>
        {required.features.map(f => (
          <div key={f} className="flex items-center gap-2 text-xs text-foreground">
            <Sparkles size={12} style={{ color: required.color }} />
            {f}
          </div>
        ))}
        <p className="text-lg font-bold text-foreground pt-2">
          R$ {required.price.toFixed(2).replace('.', ',')}<span className="text-xs font-normal text-muted-foreground">/mês</span>
        </p>
      </div>

      <Link href="/dashboard/assinatura">
        <button
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: required.color, boxShadow: `0 4px 16px ${required.color}40` }}
        >
          Fazer upgrade <ArrowRight size={15} />
        </button>
      </Link>

      <p className="text-xs text-muted-foreground mt-4">
        Cancele quando quiser · Sem fidelidade
      </p>
    </motion.div>
  )
}
