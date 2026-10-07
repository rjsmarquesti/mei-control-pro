export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

type TrialStatus = 'ativo' | 'expirando' | 'convertido' | 'expirado'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const now = new Date()

  const profiles = await prisma.user.findMany({
    where: { role: { not: 'admin' }, trialStartedAt: { not: null } },
    select: {
      id: true, name: true, email: true, phone: true, subscriptionPlan: true,
      subscriptionExpiresAt: true, isTrial: true, trialStartedAt: true, status: true, role: true,
    },
  })

  const withStatus = profiles.map(p => {
    const expiresAt = p.subscriptionExpiresAt
    const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

    let trialStatus: TrialStatus
    if (!p.isTrial && p.subscriptionPlan !== 'free') {
      trialStatus = 'convertido'
    } else if (p.isTrial && daysLeft !== null && daysLeft <= 7 && daysLeft > 0) {
      trialStatus = 'expirando'
    } else if (p.isTrial && daysLeft !== null && daysLeft > 7) {
      trialStatus = 'ativo'
    } else {
      trialStatus = 'expirado'
    }

    return {
      id: p.id,
      nome: p.name ?? '—',
      email: p.email ?? '—',
      plano: p.subscriptionPlan,
      trial_iniciado: p.trialStartedAt,
      expira_em: p.subscriptionExpiresAt,
      dias_restantes: daysLeft,
      status: trialStatus,
    }
  })

  const ativos      = withStatus.filter(p => p.status === 'ativo').length
  const expirando   = withStatus.filter(p => p.status === 'expirando').length
  const convertidos = withStatus.filter(p => p.status === 'convertido').length
  const expirados   = withStatus.filter(p => p.status === 'expirado').length
  const total = convertidos + expirados
  const taxaConversao = total > 0 ? Math.round((convertidos / total) * 100) : 0

  return NextResponse.json({
    metricas: { ativos, expirando, convertidos, expirados, taxaConversao },
    lista: withStatus.sort((a, b) => {
      const order: Record<TrialStatus, number> = { expirando: 0, ativo: 1, expirado: 2, convertido: 3 }
      return order[a.status] - order[b.status]
    }),
  })
}
