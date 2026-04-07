'use client'

export const dynamic = 'force-dynamic'

import { motion } from 'framer-motion'
import { Check, Crown, ArrowRight, Sparkles, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAppStore } from '@/store/useAppStore'
import { usePlan } from '@/hooks/usePlan'
import { supabase } from '@/lib/supabase'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const plans = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    color: '#6B7280',
    description: 'Para quem está começando',
    features: ['Dashboard', 'Receitas e despesas (20/mês)', 'Perfil'],
    missing: ['Financeiro', 'Categorias', 'Relatórios avançados', 'DAS & Impostos', 'IRPF Anual'],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 19.90,
    color: '#06B6D4',
    description: 'Para MEI organizado',
    features: ['Tudo do Gratuito', 'Lançamentos ilimitados', 'Financeiro', 'Categorias'],
    missing: ['Relatórios avançados', 'DAS & Impostos', 'IRPF Anual'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 39.90,
    color: '#7C3AED',
    description: 'Para MEI em crescimento',
    features: ['Tudo do Basic', 'Relatórios avançados', 'DAS & Impostos', 'Exportar PDF'],
    missing: ['IRPF Anual'],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 59.90,
    color: '#F59E0B',
    description: 'Acesso completo',
    features: ['Tudo do Pro', 'IRPF Anual automático', 'Suporte prioritário'],
    missing: [],
  },
]

function PaymentFeedback() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const returnedPlan = searchParams.get('plan')

  if (!status) return null
  return (
    <>
      {status === 'success' && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl border border-green-500/20 bg-green-500/10 text-green-400">
          <CheckCircle size={20} />
          <div>
            <p className="text-sm font-semibold">Pagamento aprovado!</p>
            <p className="text-xs opacity-80">Seu plano {returnedPlan} foi ativado. Bem-vindo!</p>
          </div>
        </motion.div>
      )}
      {status === 'pending' && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
          <Clock size={20} />
          <div>
            <p className="text-sm font-semibold">Pagamento em processamento</p>
            <p className="text-xs opacity-80">Assim que confirmado, seu plano será ativado automaticamente.</p>
          </div>
        </motion.div>
      )}
      {status === 'failure' && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
          <AlertCircle size={20} />
          <div>
            <p className="text-sm font-semibold">Pagamento não aprovado</p>
            <p className="text-xs opacity-80">Tente novamente ou use outra forma de pagamento.</p>
          </div>
        </motion.div>
      )}
    </>
  )
}

export default function AssinaturaPage() {
  const { brandSettings } = useAppStore()
  const { plan: currentPlan, loading: planLoading } = usePlan()
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          userId: session.user.id,
          userEmail: session.user.email,
        }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Erro ao iniciar pagamento. Tente novamente.')
      }
    } catch {
      alert('Erro ao conectar. Tente novamente.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const cfg = plans.find(p => p.id === currentPlan) ?? plans[0]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Assinatura</h2>
          <p className="text-sm text-muted-foreground mt-1">Escolha o plano ideal para o seu negócio</p>
        </div>

        {/* Payment return feedback */}
        <Suspense fallback={null}>
          <PaymentFeedback />
        </Suspense>

        {/* Current plan banner */}
        {!planLoading && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 flex items-center justify-between flex-wrap gap-3"
            style={{ borderLeft: `4px solid ${cfg.color}` }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${cfg.color}18` }}>
                <Sparkles size={18} style={{ color: cfg.color }} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Plano {cfg.name} — Ativo</p>
                <p className="text-xs text-muted-foreground">
                  {currentPlan === 'free' ? 'Sem cobrança' : 'Renova mensalmente via Mercado Pago'}
                </p>
              </div>
            </div>
            {currentPlan !== 'premium' && (
              <button
                onClick={() => handleCheckout('pro')}
                className="btn-primary gap-2 text-sm"
              >
                <Crown size={14} /> Fazer upgrade
              </button>
            )}
          </motion.div>
        )}

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((plan, i) => {
            const isCurrent = plan.id === currentPlan
            const isLoading = checkoutLoading === plan.id

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-6 flex flex-col relative"
                style={plan.popular ? { boxShadow: `0 0 0 2px ${plan.color}` } : isCurrent && plan.id !== 'free' ? { boxShadow: `0 0 0 2px ${plan.color}80` } : {}}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold text-white"
                    style={{ background: plan.color }}>
                    Mais popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-[11px] font-bold text-white"
                    style={{ background: plan.color }}>
                    Seu plano
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${plan.color}18` }}>
                    <Sparkles size={20} style={{ color: plan.color }} />
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
                    <div key={f} className="flex items-center gap-2 opacity-35">
                      <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0 bg-muted">
                        <Check size={9} className="text-muted-foreground" strokeWidth={3} />
                      </div>
                      <span className="text-xs text-muted-foreground line-through">{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  disabled={isCurrent || isLoading}
                  onClick={() => plan.id !== 'free' && !isCurrent && handleCheckout(plan.id)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${isCurrent ? 'bg-muted text-muted-foreground cursor-default' : 'text-white hover:opacity-90'}`}
                  style={!isCurrent && plan.id !== 'free' ? { background: plan.color, boxShadow: `0 4px 16px ${plan.color}35` } : {}}
                >
                  {isLoading ? (
                    <><Loader2 size={14} className="animate-spin" /> Aguarde...</>
                  ) : isCurrent ? (
                    'Plano atual'
                  ) : plan.id === 'free' ? (
                    'Plano gratuito'
                  ) : (
                    <>Assinar {plan.name} <ArrowRight size={14} /></>
                  )}
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* Payment methods */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Formas de pagamento aceitas</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {['Cartão de crédito', 'Cartão de débito', 'Pix', 'Boleto bancário'].map(m => (
              <span key={m} className="px-3 py-1.5 rounded-lg border border-border/60 bg-muted/30">{m}</span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Pagamentos processados com segurança pelo Mercado Pago.</p>
        </motion.div>

        {/* FAQ */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="text-base font-bold text-foreground mb-4">Perguntas frequentes</h3>
          <div className="space-y-4">
            {[
              { q: 'Posso cancelar a qualquer momento?', a: 'Sim! Sem multas ou fidelidade. Cancele quando quiser.' },
              { q: 'Meus dados ficam salvos se eu cancelar?', a: 'Seus dados ficam disponíveis por 30 dias após o cancelamento.' },
              { q: 'O plano renova automaticamente?', a: 'Não. Cada pagamento é avulso e ativa o plano por 30 dias.' },
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
