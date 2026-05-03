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
import { getServiceClient } from '@/lib/supabase-server'

const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET
const MEI_LIMITE_ANUAL = Number(process.env.MEI_LIMITE_ANUAL ?? 81000)
const LIMITE_ALERTA_PCT = 0.75 // alerta a partir de 75%

function formatPhone(phone: string): string {
  const d = (phone || '').replace(/\D/g, '')
  if (d.length === 11) return '55' + d
  if (d.length === 13) return d
  if (d.length > 8) return '55' + d
  return ''
}

// Verifica se o tipo de notificação foi enviado nos últimos N dias
function notifiedRecently(notified: Record<string, string>, tipo: string, days: number): boolean {
  const last = notified?.[tipo]
  if (!last) return false
  const diff = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24)
  return diff < days
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-n8n-secret')
  if (N8N_SECRET && secret !== N8N_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getServiceClient()
    const now = new Date()
    const events: object[] = []

    // ── Busca todos os assinantes não-free ativos ──────────────────
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, name, email, phone, cnpj, subscription_plan, subscription_expires_at, last_seen_at, lifecycle_notified, created_at')
      .in('subscription_plan', ['basic', 'pro', 'premium'])
      .eq('status', 'active')

    if (error) throw new Error(error.message)
    if (!profiles?.length) return NextResponse.json({ ok: true, events: [] })

    const year = now.getFullYear().toString()

    for (const p of profiles) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notified: Record<string, string> = (p.lifecycle_notified as any) ?? {}
      const phoneWA = formatPhone(p.phone ?? '')
      const base = {
        userId: p.id,
        nome: p.name ?? 'MEI',
        email: p.email ?? '',
        phone: p.phone ?? '',
        phoneWA,
        hasPhone: phoneWA.length >= 12,
        plano: p.subscription_plan,
      }

      // ── [A] Plano expirando em ≤5 dias ────────────────────────────
      if (p.subscription_expires_at) {
        const expiresAt = new Date(p.subscription_expires_at)
        const daysUntil = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntil > 0 && daysUntil <= 5 && !notifiedRecently(notified, 'plano_expirando', 4)) {
          events.push({
            ...base,
            tipo: 'plano_expirando',
            dados: {
              dias_restantes: daysUntil,
              data_expiracao: expiresAt.toLocaleDateString('pt-BR'),
              link_renovacao: 'https://app.sismeipro.com.br/dashboard/assinatura',
            },
          })
        }

        // ── [B] Plano expirado (D0, D3, D7) ──────────────────────────
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
              ...base,
              tipo: subTipo,
              dados: {
                dias_expirado: daysExpired,
                data_expiracao: expiresAt.toLocaleDateString('pt-BR'),
                link_renovacao: 'https://app.sismeipro.com.br/dashboard/assinatura',
              },
            })
          }
        }
      }

      // ── [C] Receita anual ≥ 75% do limite MEI ──────────────────────
      if (!notifiedRecently(notified, 'limite_mei', 30)) {
        const { data: anual } = await supabase
          .from('transactions')
          .select('value')
          .eq('user_id', p.id)
          .eq('type', 'revenue')
          .gte('date', `${year}-01-01`)
          .lte('date', `${year}-12-31`)

        const receita_anual = (anual ?? []).reduce((acc, t) => acc + Number(t.value), 0)
        const pct = receita_anual / MEI_LIMITE_ANUAL

        if (pct >= LIMITE_ALERTA_PCT) {
          const percentual = Math.round(pct * 100)
          events.push({
            ...base,
            tipo: 'limite_mei',
            dados: {
              receita_anual: `R$ ${receita_anual.toFixed(2).replace('.', ',')}`,
              percentual,
              limite: `R$ ${MEI_LIMITE_ANUAL.toLocaleString('pt-BR')},00`,
            },
          })
        }
      }

      // ── [D] Inativo há ≥7 dias ─────────────────────────────────────
      if (p.last_seen_at && !notifiedRecently(notified, 'inativo', 14)) {
        const lastSeen = new Date(p.last_seen_at)
        const daysInactive = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24))

        if (daysInactive >= 7) {
          events.push({
            ...base,
            tipo: 'inativo',
            dados: {
              dias_inativo: daysInactive,
              ultimo_acesso: lastSeen.toLocaleDateString('pt-BR'),
              link_app: 'https://app.sismeipro.com.br/dashboard',
            },
          })
        }
      }

      // ── [E] Marco de 30 dias como cliente ──────────────────────────
      if (p.created_at && !notifiedRecently(notified, 'marco_30d', 365)) {
        const createdAt = new Date(p.created_at)
        const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

        if (daysSince >= 29 && daysSince <= 31) {
          events.push({
            ...base,
            tipo: 'marco_30d',
            dados: {
              dias_como_cliente: daysSince,
              link_app: 'https://app.sismeipro.com.br/dashboard',
            },
          })
        }
      }
    }

    return NextResponse.json({ ok: true, total: events.length, events })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
