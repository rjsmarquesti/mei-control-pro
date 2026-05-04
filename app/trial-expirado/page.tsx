'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, Clock, MessageCircle, Loader2, Crown, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 19.90,
    annualPrice: 191.04,
    color: '#06B6D4',
    description: 'Para MEI organizado',
    features: ['Lançamentos ilimitados', 'Financeiro completo', 'Categorias', 'Dashboard'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 39.90,
    annualPrice: 382.56,
    color: '#7C3AED',
    description: 'Para MEI em crescimento',
    features: ['Tudo do Basic', 'Relatórios avançados', 'DAS & Impostos', 'Exportar PDF'],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 59.90,
    annualPrice: 574.08,
    color: '#F59E0B',
    description: 'Acesso total',
    features: ['Tudo do Pro', 'IRPF Anual automático', 'Suporte prioritário'],
  },
]

const WA_ADMIN = 'https://wa.me/5521980485675?text=Ol%C3%A1%2C%20preciso%20de%20mais%20tempo%20no%20teste%20do%20MEI%20Control%20Pro'

export default function TrialExpiradoPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setUserEmail(session.user.email ?? '')
    })
  }, [router])

  async function handleCheckout(planId: string) {
    setLoading(planId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const finalPlan = billing === 'annual' ? `${planId}_annual` : planId
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan: finalPlan }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err: any) {
      alert('Erro ao iniciar pagamento. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center px-6 py-5 border-b border-border">
        <img src="/logo.webp" alt="MEI Control Pro" className="h-8" />
      </div>

      <div className="flex-1 px-4 py-10 max-w-4xl mx-auto w-full">
        {/* Banner */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Clock className="w-4 h-4" />
            Período de teste encerrado
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Seu acesso gratuito expirou
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Você teve acesso completo ao MEI Control Pro por 7 dias. Escolha um plano para continuar gerenciando seu negócio.
          </p>
        </motion.div>

        {/* Toggle mensal/anual */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-1 bg-surface border border-border rounded-full p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${billing === 'annual' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Anual
              <span className="ml-1.5 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </div>

        {/* Cards de planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {PLANS.map((plan, i) => {
            const price = billing === 'annual' ? plan.annualPrice / 12 : plan.price
            const isLoading = loading === plan.id

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`relative bg-surface border rounded-2xl p-6 flex flex-col ${plan.popular ? 'border-[#7C3AED] shadow-lg shadow-[#7C3AED]/10' : 'border-border'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#7C3AED] text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Mais popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }} />
                    <span className="font-bold text-foreground text-lg">{plan.name}</span>
                  </div>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                </div>

                <div className="mb-5">
                  <span className="text-3xl font-bold text-foreground">
                    R$ {price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                  {billing === 'annual' && (
                    <p className="text-green-400 text-xs mt-1">
                      R$ {plan.annualPrice.toFixed(2).replace('.', ',')} cobrado anualmente
                    </p>
                  )}
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={!!loading}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: plan.color, color: '#fff' }}
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Assinar {plan.name}</>
                  )}
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* Link suporte */}
        <div className="text-center text-sm text-muted-foreground">
          Precisa de mais tempo ou tem dúvidas?{' '}
          <a
            href={WA_ADMIN}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Fale conosco no WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
