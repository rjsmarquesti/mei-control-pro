export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

const N8N_BASE = 'https://n8n.divulgabr.com.br'

function formatPhone(phone: string): string {
  const d = (phone || '').replace(/\D/g, '')
  if (d.length === 11) return '55' + d
  if (d.length === 13) return d
  if (d.length > 8) return '55' + d
  return ''
}

export async function POST(req: NextRequest) {
  // O alvo do alerta é sempre o dono do token — nunca um userId vindo do corpo.
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const profile = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } })

    const phoneWA = formatPhone(profile?.phone ?? '')
    if (!phoneWA || phoneWA.length < 12) {
      return NextResponse.json({ ok: true, skipped: 'no_phone' })
    }

    const now = new Date()
    const timestamp = now.toISOString()
    const dataBR = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const horaBR = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })

    fetch(`${N8N_BASE}/webhook/mei-login-alerta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: profile?.name ?? 'usuário',
        phone: profile?.phone ?? '',
        phoneWA,
        timestamp,
        data: dataBR,
        hora: horaBR,
        appUrl: 'https://app.sismeipro.com.br',
        instance: 'sismei',
      }),
    }).catch((e) => { console.error('[login-notify] n8n webhook error:', e) })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
