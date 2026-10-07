export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/das-alert
 * Chamado pelo n8n via cron (ex: todo dia às 9h)
 * Verifica DAS a vencer em 15, 7 e 1 dia para todos os assinantes pagantes
 * e dispara webhook n8n com dados para envio de email + WhatsApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const N8N_WEBHOOK = 'https://n8n.divulgabr.com.br/webhook/mei-das-alerta'
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET
const ALERT_DAYS = [15, 7, 1]

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-n8n-secret')
  if (!N8N_SECRET || secret !== N8N_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const profiles = await prisma.user.findMany({
      where: { subscriptionPlan: { in: ['pro', 'premium'] } },
      select: { id: true, name: true, email: true, phone: true, cnpj: true },
    })

    if (profiles.length === 0) return NextResponse.json({ ok: true, sent: 0 })

    let sent = 0

    for (const profile of profiles) {
      const dasList = await prisma.dasPayment.findMany({
        where: { userId: profile.id, status: { in: ['pending', 'overdue'] } },
        orderBy: { dueDate: 'asc' },
      })

      if (dasList.length === 0) continue

      for (const das of dasList) {
        const dueDate = new Date(das.dueDate)
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        const shouldAlert = ALERT_DAYS.includes(diffDays) || das.status === 'overdue'
        if (!shouldAlert) continue

        const payload = {
          tipo: das.status === 'overdue' ? 'vencido' : `${diffDays}d`,
          nome: profile.name,
          email: profile.email,
          phone: profile.phone,
          cnpj: profile.cnpj ?? '',
          das_id: das.id.toString(),
          das_valor: das.value,
          das_vencimento: dueDate.toLocaleDateString('pt-BR'),
          das_competencia: das.competencia ?? '',
          dias_restantes: diffDays,
          link: 'https://app.sismeipro.com.br/dashboard/das',
        }

        try {
          await fetch(N8N_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          sent++
        } catch (e) { console.error('[das-alert] n8n webhook error:', e) }
      }
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
