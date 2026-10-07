export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const N8N_TRIAL_WEBHOOK = 'https://n8n.divulgabr.com.br/webhook/mei-trial'

function formatPhone(phone: string): string {
  const d = (phone || '').replace(/\D/g, '')
  if (d.length === 11) return '55' + d
  if (d.length === 13) return d
  if (d.length > 8) return '55' + d
  return ''
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserFromRequest(req)
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, subscriptionPlan: true, isTrial: true, trialActivatedAt: true, status: true },
    })

    if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    const now = new Date()
    const trialExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // UPDATE atômico: só executa se trial_activated_at IS NULL e plano = free
    const { count } = await prisma.user.updateMany({
      where: { id: userId, subscriptionPlan: 'free', trialActivatedAt: null, status: { not: 'trial_expired' } },
      data: {
        subscriptionPlan: 'premium',
        isTrial: true,
        status: 'active',
        trialActivatedAt: now,
        trialStartedAt: now,
        subscriptionExpiresAt: trialExpires,
      },
    })

    if (count === 0) {
      return NextResponse.json({ error: 'Trial já utilizado ou não elegível' }, { status: 409 })
    }

    // Dispara D0 para n8n (sem bloquear resposta)
    const phoneWA = formatPhone(profile.phone ?? '')
    fetch(N8N_TRIAL_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'trial_d0',
        userId,
        nome: profile.name ?? 'MEI',
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        phoneWA,
        hasPhone: phoneWA.length >= 12,
        dados: {
          data_expiracao: trialExpires.toLocaleDateString('pt-BR'),
          link_planos: 'https://app.sismeipro.com.br/dashboard/assinatura',
          link_app: 'https://app.sismeipro.com.br/dashboard',
        },
      }),
    }).catch(() => { /* n8n offline não bloqueia ativação */ })

    return NextResponse.json({ ok: true, expires_at: trialExpires.toISOString() })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[POST /api/trial/activate]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
