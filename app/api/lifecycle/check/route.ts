export const dynamic = 'force-dynamic'

/**
 * POST /api/lifecycle/check
 * Chamado pelo n8n (cron diário 08:30 BRT) para detectar eventos de lifecycle.
 * Requer header x-n8n-secret.
 *
 * Retorna array de eventos: { tipo, userId, nome, email, phone, phoneWA, dados }
 * Tipos: plano_expirando | plano_expirado | limite_mei | inativo | marco_30d
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET
const N8N_TRIAL_WEBHOOK = 'https://n8n.divulgabr.com.br/webhook/mei-trial'
const MEI_LIMITE_ANUAL = Number(process.env.MEI_LIMITE_ANUAL ?? 81000)
const LIMITE_ALERTA_PCT = 0.75 // alerta a partir de 75%

function formatPhone(phone: string): string {
  const d = (phone || '').replace(/\D/g, '')
  if (d.length === 11) return '55' + d
  if (d.length === 13) return d
  if (d.length > 8) return '55' + d
  return ''
}

function notifiedRecently(notified: Record<string, string>, tipo: string, days: number): boolean {
  const last = notified?.[tipo]
  if (!last) return false
  const diff = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24)
  return diff < days
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-n8n-secret')
  if (!N8N_SECRET || secret !== N8N_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const events: object[] = []

    // ── Busca assinantes pagos ativos + trials ativos ──────────────
    const profiles = await prisma.user.findMany({
      where: {
        OR: [
          { subscriptionPlan: { in: ['basic', 'pro', 'premium'] }, status: 'active', isTrial: false },
          { isTrial: true, status: 'active' },
        ],
      },
      select: {
        id: true, name: true, email: true, phone: true, cnpj: true, subscriptionPlan: true,
        subscriptionExpiresAt: true, isTrial: true, status: true, lastSeenAt: true,
        lifecycleNotified: true, createdAt: true, trialActivatedAt: true,
      },
    })

    if (!profiles.length) return NextResponse.json({ ok: true, events: [] })

    const year = now.getFullYear().toString()

    // Batch: busca receita anual de todos os assinantes pagos não-trial de uma vez
    const paidProfiles = profiles.filter(p => !p.isTrial)
    const limiteCandidateIds = paidProfiles
      .filter(p => !notifiedRecently((p.lifecycleNotified as Record<string, string>) ?? {}, 'limite_mei', 30))
      .map(p => p.id)

    const revenueByUser = new Map<string, number>()
    if (limiteCandidateIds.length > 0) {
      const revenueRows = await prisma.transaction.groupBy({
        by: ['userId'],
        where: {
          userId: { in: limiteCandidateIds },
          type: 'revenue',
          status: 'completed',
          date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) },
        },
        _sum: { value: true },
      })
      for (const row of revenueRows) {
        revenueByUser.set(row.userId, Number(row._sum.value ?? 0))
      }
    }

    for (const p of profiles) {
      const notified: Record<string, string> = (p.lifecycleNotified as Record<string, string>) ?? {}
      const phoneWA = formatPhone(p.phone ?? '')
      const isTrial = p.isTrial ?? false
      const base = {
        userId: p.id,
        nome: p.name ?? 'MEI',
        email: p.email ?? '',
        phone: p.phone ?? '',
        phoneWA,
        hasPhone: phoneWA.length >= 12,
        plano: p.subscriptionPlan,
        is_trial: isTrial,
      }

      // ── [TRIAL] Eventos exclusivos de trial ───────────────────────
      if (isTrial && p.subscriptionExpiresAt) {
        const trialExpiresAt = p.subscriptionExpiresAt
        const daysUntil = Math.ceil((trialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        const trialActivatedAt = p.trialActivatedAt
        if (trialActivatedAt) {
          const daysSince = Math.floor((now.getTime() - trialActivatedAt.getTime()) / (1000 * 60 * 60 * 24))

          if (daysSince >= 2 && daysSince <= 4 && !notifiedRecently(notified, 'trial_d3', 2)) {
            events.push({
              ...base, tipo: 'trial_d3',
              dados: { dias_restantes: daysUntil, data_expiracao: trialExpiresAt.toLocaleDateString('pt-BR'), link_planos: 'https://app.sismeipro.com.br/dashboard/assinatura' },
            })
          }
          if (daysSince >= 6 && daysSince <= 8 && !notifiedRecently(notified, 'trial_d7', 2)) {
            events.push({
              ...base, tipo: 'trial_d7',
              dados: { dias_restantes: daysUntil, data_expiracao: trialExpiresAt.toLocaleDateString('pt-BR'), link_planos: 'https://app.sismeipro.com.br/dashboard/assinatura' },
            })
          }
          if (daysSince >= 13 && daysSince <= 15 && !notifiedRecently(notified, 'trial_d14', 2)) {
            events.push({
              ...base, tipo: 'trial_d14',
              dados: { dias_restantes: daysUntil, data_expiracao: trialExpiresAt.toLocaleDateString('pt-BR'), link_planos: 'https://app.sismeipro.com.br/dashboard/assinatura' },
            })
          }
        }

        if (daysUntil > 2 && daysUntil <= 9 && !notifiedRecently(notified, 'trial_7d', 7)) {
          events.push({
            ...base, tipo: 'trial_7d',
            dados: { dias_restantes: daysUntil, data_expiracao: trialExpiresAt.toLocaleDateString('pt-BR'), link_planos: 'https://app.sismeipro.com.br/dashboard/assinatura' },
          })
        }

        if (daysUntil > 0 && daysUntil <= 2 && !notifiedRecently(notified, 'trial_expirando', 7)) {
          events.push({
            ...base, tipo: 'trial_expirando',
            dados: { dias_restantes: daysUntil, data_expiracao: trialExpiresAt.toLocaleDateString('pt-BR'), link_planos: 'https://app.sismeipro.com.br/dashboard/assinatura' },
          })
        }

        if (daysUntil <= 0 && !notifiedRecently(notified, 'trial_expirado', 2)) {
          const trialPayload = {
            ...base, tipo: 'trial_expirado',
            dados: { data_expiracao: trialExpiresAt.toLocaleDateString('pt-BR'), link_planos: 'https://app.sismeipro.com.br/trial-expirado' },
          }

          try {
            await fetch(N8N_TRIAL_WEBHOOK, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trialPayload),
            })
          } catch { /* n8n offline — downgrade ainda ocorre */ }

          await prisma.user.update({
            where: { id: p.id },
            data: { status: 'trial_expired', subscriptionPlan: 'free', isTrial: false },
          })

          events.push(trialPayload)
        }
      }

      // Pular demais eventos para usuários em trial
      if (isTrial) continue

      // ── [A] Plano expirando em ≤5 dias ────────────────────────────
      if (p.subscriptionExpiresAt) {
        const expiresAt = p.subscriptionExpiresAt
        const daysUntil = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntil > 0 && daysUntil <= 5 && !notifiedRecently(notified, 'plano_expirando', 4)) {
          events.push({
            ...base, tipo: 'plano_expirando',
            dados: { dias_restantes: daysUntil, data_expiracao: expiresAt.toLocaleDateString('pt-BR'), link_renovacao: 'https://app.sismeipro.com.br/dashboard/assinatura' },
          })
        }

        if (daysUntil <= 0) {
          const daysExpired = Math.abs(daysUntil)
          const alreadyD0 = notifiedRecently(notified, 'plano_expirado_d0', 2)
          const alreadyD3 = notifiedRecently(notified, 'plano_expirado_d3', 2)
          const alreadyD7 = notifiedRecently(notified, 'plano_expirado_d7', 2)

          let subTipo: string | null = null
          if (daysExpired <= 1 && !alreadyD0) subTipo = 'plano_expirado_d0'
          else if (daysExpired >= 2 && daysExpired <= 4 && !alreadyD3) subTipo = 'plano_expirado_d3'
          else if (daysExpired >= 5 && daysExpired <= 8 && !alreadyD7) subTipo = 'plano_expirado_d7'

          if (subTipo) {
            events.push({
              ...base, tipo: subTipo,
              dados: { dias_expirado: daysExpired, data_expiracao: expiresAt.toLocaleDateString('pt-BR'), link_renovacao: 'https://app.sismeipro.com.br/dashboard/assinatura' },
            })
          }
        }
      }

      // ── [C] Receita anual ≥ 75% do limite MEI ──────────────────────
      if (revenueByUser.has(p.id)) {
        const receita_anual = revenueByUser.get(p.id)!
        const pct = receita_anual / MEI_LIMITE_ANUAL

        if (pct >= LIMITE_ALERTA_PCT) {
          const percentual = Math.round(pct * 100)
          events.push({
            ...base, tipo: 'limite_mei',
            dados: {
              receita_anual: `R$ ${receita_anual.toFixed(2).replace('.', ',')}`,
              percentual,
              limite: `R$ ${MEI_LIMITE_ANUAL.toLocaleString('pt-BR')},00`,
            },
          })
        }
      }

      // ── [D] Inativo há ≥7 dias ─────────────────────────────────────
      if (p.lastSeenAt && !notifiedRecently(notified, 'inativo', 14)) {
        const lastSeen = p.lastSeenAt
        const daysInactive = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24))

        if (daysInactive >= 7) {
          events.push({
            ...base, tipo: 'inativo',
            dados: { dias_inativo: daysInactive, ultimo_acesso: lastSeen.toLocaleDateString('pt-BR'), link_app: 'https://app.sismeipro.com.br/dashboard' },
          })
        }
      }

      // ── [E] Marco de 30 dias como cliente ──────────────────────────
      if (p.createdAt && !notifiedRecently(notified, 'marco_30d', 365)) {
        const createdAt = p.createdAt
        const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

        if (daysSince >= 29 && daysSince <= 31) {
          events.push({
            ...base, tipo: 'marco_30d',
            dados: { dias_como_cliente: daysSince, link_app: 'https://app.sismeipro.com.br/dashboard' },
          })
        }
      }
    }

    // Disparar eventos de trial para o n8n (trial_expirado já é enviado inline acima)
    const trialEvents = events.filter((e): e is { tipo: string } & Record<string, unknown> =>
      ['trial_d3', 'trial_d7', 'trial_d14', 'trial_7d', 'trial_expirando'].includes((e as { tipo: string }).tipo)
    )
    for (const ev of trialEvents) {
      try {
        await fetch(N8N_TRIAL_WEBHOOK, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev),
        })
      } catch {
        // Nunca bloquear o lifecycle por falha no webhook
      }
    }

    return NextResponse.json({ ok: true, total: events.length, events })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
