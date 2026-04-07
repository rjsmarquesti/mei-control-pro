'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Receipt, CheckCircle2, Clock, AlertTriangle, Plus, ExternalLink } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PlanGate } from '@/components/plan/PlanGate'
import { DASCard } from '@/components/dashboard/DASCard'
import { useDashboard } from '@/hooks/useDashboard'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency, formatDate } from '@/lib/utils'

const mockDasHistory = [
  { id: '1', month: 'Março/2025', value: 70.60, dueDate: '2025-03-20', paidDate: '2025-03-18', status: 'paid' },
  { id: '2', month: 'Fevereiro/2025', value: 70.60, dueDate: '2025-02-20', paidDate: '2025-02-19', status: 'paid' },
  { id: '3', month: 'Janeiro/2025', value: 70.60, dueDate: '2025-01-20', paidDate: '2025-01-20', status: 'paid' },
  { id: '4', month: 'Dezembro/2024', value: 68.40, dueDate: '2024-12-20', paidDate: '2024-12-22', status: 'paid' },
  { id: '5', month: 'Novembro/2024', value: 68.40, dueDate: '2024-11-20', paidDate: null, status: 'overdue' },
]

export default function DASPage() {
  const { metrics, isLoading } = useDashboard()
  const { brandSettings } = useAppStore()

  const paid = mockDasHistory.filter((d) => d.status === 'paid').length
  const overdue = mockDasHistory.filter((d) => d.status === 'overdue').length
  const totalPaid = mockDasHistory.filter((d) => d.status === 'paid').reduce((s, d) => s + d.value, 0)

  return (
    <DashboardLayout>
      <PlanGate requiredPlan="pro" featureName="DAS & Impostos">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">DAS & Impostos</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus pagamentos do Simples Nacional</p>
          </div>
          <a href="https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/servicos-para-mei/declaracao-e-situacao-fiscal" target="_blank" rel="noopener noreferrer" className="btn-outline gap-2 text-xs">
            <ExternalLink size={14} /> Portal do Empreendedor
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          <div className="sm:col-span-1">
            <DASCard value={metrics?.dasValue ?? 70.60} dueDate={metrics?.dasDueDate ?? '2025-04-20'} isLoading={isLoading} />
          </div>
          <div className="sm:col-span-2 xl:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Pagamentos em dia', value: paid, suffix: 'guias', color: '#10B981', icon: CheckCircle2 },
              { label: 'Em atraso', value: overdue, suffix: 'guias', color: '#EF4444', icon: AlertTriangle },
              { label: 'Total pago (ano)', value: totalPaid, isCurrency: true, color: '#7C3AED', icon: Receipt },
            ].map(({ label, value, suffix, isCurrency, color, icon: Icon }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {isCurrency ? formatCurrency(value as number) : `${value} ${suffix}`}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* History */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="text-base font-bold text-foreground mb-5">Histórico de Pagamentos</h3>
          <div className="space-y-0 divide-y divide-border/50">
            {mockDasHistory.map((das, i) => (
              <motion.div key={das.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-muted/20 -mx-6 px-6 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${das.status === 'paid' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {das.status === 'paid'
                      ? <CheckCircle2 size={16} className="text-emerald-400" />
                      : <AlertTriangle size={16} className="text-red-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{das.month}</p>
                    <p className="text-xs text-muted-foreground">
                      Vencimento: {formatDate(das.dueDate)}
                      {das.paidDate && ` · Pago: ${formatDate(das.paidDate)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{formatCurrency(das.value)}</p>
                  <span className={`text-xs font-semibold ${das.status === 'paid' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {das.status === 'paid' ? 'Pago' : 'Em atraso'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Info */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 border-l-4" style={{ borderLeftColor: brandSettings.primaryColor }}>
          <p className="text-sm font-semibold text-foreground mb-1">Sobre o DAS MEI</p>
          <p className="text-xs text-muted-foreground">O DAS (Documento de Arrecadação do Simples Nacional) é pago mensalmente e inclui INSS, ISS e/ou ICMS. O vencimento é todo dia 20 de cada mês. Valor atual: <strong className="text-foreground">R$ 70,60/mês</strong>.</p>
        </motion.div>
      </div>
    </PlanGate>
    </DashboardLayout>
  )
}
