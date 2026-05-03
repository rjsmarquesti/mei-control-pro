'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, CheckCircle2, AlertCircle, Info, ExternalLink } from 'lucide-react'
import { PrintButton } from '@/components/ui/PrintButton'
import { PrintSection } from '@/components/ui/PrintSection'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PlanGate } from '@/components/plan/PlanGate'
import { useDashboard } from '@/hooks/useDashboard'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface Profile { name?: string; email?: string; cnpj?: string; city?: string }

export default function IRPFPage() {
  const { metrics, chartData } = useDashboard()
  const { brandSettings } = useAppStore()
  const [annualDasPaid, setAnnualDasPaid] = useState<number | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const year = new Date().getFullYear()
      const [{ data: das }, { data: prof }] = await Promise.all([
        supabase.from('das_payments').select('value').eq('status', 'paid')
          .gte('paid_at', `${year}-01-01`).lte('paid_at', `${year}-12-31T23:59:59`),
        supabase.from('profiles').select('name,email,cnpj,city').eq('id', session.user.id).single(),
      ])
      if (das) setAnnualDasPaid(das.reduce((s, r) => s + (r.value ?? 0), 0))
      if (prof) setProfile(prof)
    }
    load()
  }, [])

  const annualRevenue = metrics?.annualRevenue ?? chartData.reduce((s, d) => s + d.receita, 0)
  const annualExpenses = chartData.reduce((s, d) => s + d.despesa, 0)
  const annualProfit = annualRevenue - annualExpenses
  const isExempt = annualRevenue <= 81000
  const dasLabel = annualDasPaid === null ? 'DAS Pago no Ano (carregando...)' : 'DAS Pago no Ano'
  const dasDisplayValue = annualDasPaid ?? 0

  const irpfData = [
    { label: 'Receita bruta anual', value: formatCurrency(annualRevenue) },
    { label: 'Despesas dedutíveis', value: formatCurrency(annualExpenses) },
    { label: 'Resultado fiscal', value: formatCurrency(annualProfit) },
    { label: 'Limite de isenção MEI', value: 'R$ 81.000,00' },
  ]

  return (
    <DashboardLayout>
      <PlanGate requiredPlan="premium" featureName="IRPF Anual">
      <PrintSection id="irpf-print" title={`Relatório IRPF — ${new Date().getFullYear()}`} profile={profile}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 no-print">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              IRPF Anual
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400">NOVO</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Dados para declaração do Imposto de Renda</p>
          </div>
          <div className="flex gap-2">
            <PrintButton label="Exportar PDF" />
            <a href="https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda" target="_blank" rel="noopener noreferrer" className="btn-outline gap-2 text-xs">
              <ExternalLink size={14} /> Receita Federal
            </a>
          </div>
        </div>

        {/* Status banner */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className={`glass-card p-5 border-l-4 flex items-start gap-4 ${isExempt ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isExempt ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
            {isExempt ? <CheckCircle2 size={20} className="text-emerald-400" /> : <AlertCircle size={20} className="text-amber-400" />}
          </div>
          <div>
            <p className={`text-sm font-bold ${isExempt ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isExempt ? 'Você está dentro do limite MEI' : 'Atenção: limite MEI ultrapassado'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isExempt
                ? `Sua receita anual (${formatCurrency(annualRevenue)}) está dentro do limite de R$ 81.000,00. Você pode continuar como MEI.`
                : `Sua receita ultrapassou o limite MEI. Considere migrar para ME (Microempresa).`}
            </p>
          </div>
        </motion.div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Receita Bruta', value: annualRevenue, color: '#10B981' },
            { label: 'Despesas', value: annualExpenses, color: '#EF4444' },
            { label: 'Resultado', value: annualProfit, color: '#7C3AED' },
            { label: dasLabel, value: dasDisplayValue, color: '#06B6D4' },
          ].map(({ label, value, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-5">
              <p className="text-xs text-muted-foreground mb-2">{label}</p>
              <p className="text-xl font-bold" style={{ color }}>{formatCurrency(value)}</p>
            </motion.div>
          ))}
        </div>

        {/* IRPF table */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="text-base font-bold text-foreground mb-5">Resumo para Declaração</h3>
          <div className="space-y-0 divide-y divide-border/50">
            {irpfData.map(({ label, value }, i) => (
              <div key={label} className="flex items-center justify-between py-3.5">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 no-print">
            <button
              onClick={() => window.print()}
              disabled={annualRevenue === 0}
              title={annualRevenue === 0 ? 'Nenhuma receita lançada para gerar o relatório' : ''}
              className="btn-primary gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={15} /> Gerar Relatório IRPF
            </button>
            <a
              href="https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline gap-2"
            >
              <FileText size={15} /> Ver Instruções
            </a>
          </div>
          {annualRevenue === 0 && (
            <p className="text-xs text-amber-400 mt-3 flex items-center gap-1.5 no-print">
              <AlertCircle size={13} /> Lance suas receitas para gerar o relatório IRPF.
            </p>
          )}
        </motion.div>

        {/* Tips */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info size={16} style={{ color: brandSettings.primaryColor }} />
            <h3 className="text-base font-bold text-foreground">Orientações para o MEI</h3>
          </div>
          <div className="space-y-3">
            {[
              'O MEI deve preencher a Declaração Anual do Simples Nacional (DASN-SIMEI) até 31 de maio.',
              'A declaração do IRPF Pessoa Física é obrigatória se a renda anual ultrapassar R$ 28.559,70.',
              'Guarde todos os comprovantes de receitas e despesas pelo prazo de 5 anos.',
              'O contador MEI pode ajudar a identificar deduções legais e reduzir o imposto a pagar.',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `color-mix(in srgb, ${brandSettings.primaryColor} 15%, transparent)` }}>
                  <span className="text-[10px] font-bold" style={{ color: brandSettings.primaryColor }}>{i + 1}</span>
                </div>
                <p className="text-xs text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      </PrintSection>
    </PlanGate>
    </DashboardLayout>
  )
}
