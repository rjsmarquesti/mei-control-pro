export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/das-alert
 * Chamado pelo n8n via cron (ex: todo dia às 9h)
 * Verifica DAS a vencer em 15, 7 e 1 dia para todos os assinantes pagantes
 * e dispara webhook n8n com dados para envio de email + WhatsApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

const N8N_WEBHOOK = 'https://n8n.divulgabr.com.br/webhook/mei-das-alerta'
const ALERT_DAYS = [15, 7, 1]

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Busca todos os assinantes pagantes com perfil
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, phone, cnpj')
      .in('subscription_plan', ['pro', 'premium'])

    if (!profiles || profiles.length === 0) return NextResponse.json({ ok: true, sent: 0 })

    let sent = 0

    for (const profile of profiles) {
      // Busca DAS pendentes do usuário
      const { data: dasList } = await supabase
        .from('das_payments')
        .select('id, due_date, value, competencia, status')
        .eq('user_id', profile.id)
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true })

      if (!dasList || dasList.length === 0) continue

      for (const das of dasList) {
        const dueDate = new Date(das.due_date + 'T12:00:00')
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        // Dispara apenas nas datas certas (15, 7, 1 dia antes) ou se já vencido
        const shouldAlert = ALERT_DAYS.includes(diffDays) || das.status === 'overdue'
        if (!shouldAlert) continue

        const payload = {
          tipo: das.status === 'overdue' ? 'vencido' : `${diffDays}d`,
          nome: profile.name,
          email: profile.email,
          phone: profile.phone,
          cnpj: profile.cnpj ?? '',
          das_id: das.id,
          das_valor: das.value,
          das_vencimento: dueDate.toLocaleDateString('pt-BR'),
          das_competencia: das.competencia ?? '',
          dias_restantes: diffDays,
          link: 'https://app.sismeipro.com.br/dashboard/das',
        }

        // Dispara webhook n8n (não bloqueia se falhar)
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
