'use client'

import { useState } from 'react'
import { Zap, Clock, ArrowRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/session'
import { usePlan } from '@/hooks/usePlan'

interface TrialBannerProps {
  transactionCount?: number
}

export function TrialBanner({ transactionCount = 0 }: TrialBannerProps) {
  const { plan, isTrial, trialEligible, daysLeft, loading } = usePlan()
  const [activating, setActivating] = useState(false)
  const router = useRouter()

  async function activateTrial() {
    setActivating(true)
    try {
      const res = await authFetch('/api/trial/activate', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || json.error) {
        alert(json.error ?? 'Erro ao ativar trial. Tente novamente.')
        return
      }
      router.refresh()
    } finally {
      setActivating(false)
    }
  }

  if (loading) return null

  // Banner de trial ativo
  if (isTrial && daysLeft !== null) {
    const urgent = daysLeft <= 7
    const color = urgent ? '#EF4444' : '#7C3AED'
    const bg = urgent ? 'rgba(239,68,68,0.08)' : 'rgba(124,58,237,0.08)'
    const border = urgent ? 'rgba(239,68,68,0.25)' : 'rgba(124,58,237,0.25)'

    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm mb-4"
        style={{ background: bg, borderColor: border }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {urgent ? (
            <Clock size={16} style={{ color, flexShrink: 0 }} />
          ) : (
            <Zap size={16} style={{ color, flexShrink: 0 }} />
          )}
          <span style={{ color }} className="font-semibold shrink-0">
            {urgent ? `⚠️ Trial expira em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}` : `🎉 Trial Pro ativo — ${daysLeft} dias restantes`}
          </span>
          {!urgent && (
            <span className="text-muted-foreground hidden sm:inline truncate">
              Aproveite DAS, relatórios e alertas no WhatsApp
            </span>
          )}
        </div>
        <Link href="/dashboard/assinatura" className="shrink-0">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ background: color }}
          >
            Assinar <ArrowRight size={12} />
          </button>
        </Link>
      </div>
    )
  }

  // CTA de ativação de trial para free elegível com ≥10 lançamentos
  if (trialEligible && transactionCount >= 10) {
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm mb-4"
        style={{ background: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.25)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Zap size={16} style={{ color: '#7C3AED', flexShrink: 0 }} />
          <span className="text-foreground truncate">
            Você já tem <strong>{transactionCount} lançamentos</strong> — ative o trial e desbloqueie relatórios, DAS e alertas no WhatsApp
          </span>
        </div>
        <button
          onClick={activateTrial}
          disabled={activating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 shrink-0 disabled:opacity-60"
          style={{ background: '#7C3AED' }}
        >
          {activating ? 'Ativando...' : <>Ativar 30 dias grátis <ArrowRight size={12} /></>}
        </button>
      </div>
    )
  }

  return null
}
