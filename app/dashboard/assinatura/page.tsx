'use client'

export const dynamic = 'force-dynamic'

import { motion } from 'framer-motion'
import { Check, Zap, Crown, Building2, ArrowRight, Sparkles } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAppStore } from '@/store/useAppStore'
import { usePlan } from '@/hooks/usePlan'
import { PLAN_CONFIGS } from '@/lib/plans'

const plans = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    icon: Zap,
    color: '#6B7280',
    description: 'Para quem está começando',
    features: ['Dashboard', 'Receitas e despesas (20/mês)', 'Perfil'],
    missing: ['Financeiro', 'Categorias', 'Relatórios', 'DAS & Impostos', 'IRPF Anual'],
    cta: 'Plano atual',
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 19.90,
    icon: Zap,
    color: '#06B6D4',
    description: 'Para MEI organizado',
    features: ['Tudo do Gratuito', 'Lançamentos ilimitados', 'Financeiro', 'Categorias'],
    missing: ['Relatórios avançados', 'DAS & Impostos', 'IRPF Anual'],
    cta: 'Assinar Basic',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 39.90,
    icon: Crown,
    color: '#7C3AED',
    description: 'Para MEI em crescimento',
    features: ['Tudo do Basic', 'Relatórios avançados', 'DAS & Impostos', 'Exportar PDF'],
    missing: ['IRPF Anual'],
    cta: 'Assinar Pro',
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 59.90,
    icon: Building2,
    color: '#F59E0B',
    description: 'Acesso total',
    features: ['Tudo do Pro', 'IRPF Anual automático', 'Suporte prioritário'],
    missing: [],
    cta: 'Assinar Premium',
  },
]

export default function AssinaturaPage() {
  const { brandSettings } = useAppStore()
  const { plan: currentPlan } = usePlan()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Assinatura</h2>
          <p className="text-sm text-muted-foreground mt-1">Escolha o plano ideal para o seu negócio</p>
        </div>

        {/* Current plan banner */}
        {(() => {
          const cfg = plans.find(p => p.id === currentPlan) ?? plans[0]
          return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 flex items-center justify-between flex-wrap gap-3"
              style={{ borderLeft: `4px solid ${cfg.color}` }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${cfg.color}18` }}>
                  <Sparkles size={18} style={{ color: cfg.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Plano {cfg.name} — Ativo</p>
                  <p className="text-xs text-muted-foreground">
                    {currentPlan === 'free' ? 'Sem cobrança' : 'Renova mensalmente'}
                  </p>
                </div>
              </div>
              {currentPlan !== 'premium' && (
                <button className="btn-primary gap-2 text-sm">
                  <Crown size={14} /> Fazer upgrade
                </button>
              )}
            </motion.div>
          )
        })()}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan, i) => {
            const Icon = plan.icon
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 flex flex-col relative"
                style={plan.popular ? { boxShadow: `0 0 0 2px ${plan.color}` } : {}}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold text-white"
                    style={{ background: plan.color }}>
                    Mais popular
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${plan.color}18` }}>
                    <Icon size={20} style={{ color: plan.color }} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-5">
                  {plan.price === 0 ? (
                    <p className="text-3xl font-bold text-foreground">Grátis</p>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <span className="text-3xl font-bold text-foreground">{plan.price.toFixed(2).replace('.', ',')}</span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0" style={{ background: `${plan.color}20` }}>
                        <Check size={9} style={{ color: plan.color }} strokeWidth={3} />
                      </div>
                      <span className="text-xs text-foreground">{f}</span>
                    </div>
                  ))}
                  {plan.missing.map((f) => (
                    <div key={f} className="flex items-center gap-2 opacity-40">
                      <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0 bg-muted">
                        <Check size={9} className="text-muted-foreground" strokeWidth={3} />
                      </div>
                      <span className="text-xs text-muted-foreground line-through">{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  disabled={plan.id === currentPlan}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${plan.id === currentPlan ? 'bg-muted text-muted-foreground cursor-default' : 'text-white'}`}
                  style={plan.id !== currentPlan ? { background: plan.color, boxShadow: `0 4px 16px ${plan.color}35` } : {}}
                >
                  {plan.id === currentPlan ? 'Plano atual' : <>{plan.cta} <ArrowRight size={14} /></>}
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* FAQ */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="text-base font-bold text-foreground mb-4">Perguntas frequentes</h3>
          <div className="space-y-4">
            {[
              { q: 'Posso cancelar a qualquer momento?', a: 'Sim! Sem multas ou fidelidade. Cancele quando quiser.' },
              { q: 'Meus dados ficam salvos se eu cancelar?', a: 'Seus dados ficam disponíveis por 30 dias após o cancelamento.' },
              { q: 'Aceita quais formas de pagamento?', a: 'Cartão de crédito, Pix e boleto bancário.' },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <p className="text-sm font-semibold text-foreground mb-1">{q}</p>
                <p className="text-xs text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
