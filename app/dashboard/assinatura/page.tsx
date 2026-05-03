'use client'

export const dynamic = 'force-dynamic'

import { motion } from 'framer-motion'
import { Check, Crown, ArrowRight, Sparkles, Loader2, CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAppStore } from '@/store/useAppStore'
import { usePlan } from '@/hooks/usePlan'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, Suspense } from 'react'
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

const ANNUAL_DISCOUNT = 0.20

const annualPrice = (monthly: number) => +(monthly * 12 * (1 - ANNUAL_DISCOUNT)).toFixed(2)
const annualMonthly = (monthly: number) => +(monthly * (1 - ANNUAL_DISCOUNT)).toFixed(2)
const annualSaving = (monthly: number) => +(monthly * 12 * ANNUAL_DISCOUNT).toFixed(2)

export default function AssinaturaPage() {
  const { brandSettings } = useAppStore()
  const { plan: currentPlan, expiresAt, loading: planLoading } = usePlan()
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')

  useEffect(() => {
    if (planLoading) return
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    if (checkout && checkout !== 'free') {
      handleCheckout(checkout)
    }
  }, [planLoading])

  const getCheckoutPlanId = (planId: string) =>
    billing === 'annual' && planId !== 'free' ? `${planId}_annual` : planId

  const handleCheckout = async (planId: string) => {
    const checkoutPlanId = getCheckoutPlanId(planId)
    setCheckoutLoading(planId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          plan: checkoutPlanId,
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

        {/* Toggle mensal / anual */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/60">
            <button
              onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${billing === 'annual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Anual
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">-20%</span>
            </button>
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Mensal
            </button>
          </div>
          {billing === 'annual' && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <Zap size={12} /> Pague uma vez, fique tranquilo o ano inteiro
            </motion.p>
          )}
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
                  {currentPlan === 'free'
                    ? 'Sem cobrança'
                    : expiresAt
                      ? `Expira em ${new Date(expiresAt).toLocaleDateString('pt-BR')}`
                      : 'Renova mensalmente via Mercado Pago'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {currentPlan !== 'free' && (
                <button
                  onClick={() => handleCheckout(currentPlan)}
                  disabled={checkoutLoading === currentPlan}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 text-sm font-medium text-foreground hover:bg-muted transition-all"
                >
                  {checkoutLoading === currentPlan
                    ? <><Loader2 size={13} className="animate-spin" /> Aguarde...</>
                    : <><ArrowRight size={13} /> Renovar</>}
                </button>
              )}
              {currentPlan !== 'premium' && (
                <button
                  onClick={() => handleCheckout('pro')}
                  disabled={checkoutLoading === 'pro'}
                  className="btn-primary gap-2 text-sm"
                >
                  <Crown size={14} /> Fazer upgrade
                </button>
              )}
            </div>
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
                  ) : billing === 'annual' ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm text-muted-foreground line-through opacity-50">R${plan.price.toFixed(2).replace('.', ',')}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">-20%</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <span className="text-3xl font-bold text-foreground">{annualMonthly(plan.price).toFixed(2).replace('.', ',')}</span>
                        <span className="text-sm text-muted-foreground">/mês</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        R${annualPrice(plan.price).toFixed(2).replace('.', ',')} cobrado anualmente
                        <span className="text-emerald-400 font-semibold ml-1">
                          (economia de R${annualSaving(plan.price).toFixed(2).replace('.', ',')})
                        </span>
                      </p>
                    </div>
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
                  ) : billing === 'annual' ? (
                    <><Zap size={14} /> Assinar {plan.name} Anual <ArrowRight size={14} /></>
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
              { q: 'O plano renova automaticamente?', a: 'Não. Cada pagamento é avulso e ativa o plano por 30 dias (mensal) ou 365 dias (anual).' },
              { q: 'Como funciona o plano anual?', a: 'Você paga uma única vez com 20% de desconto e fica ativo por 12 meses. Ideal para quem não quer preocupação mensal.' },
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
