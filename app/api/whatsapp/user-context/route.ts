export const dynamic = 'force-dynamic'

/**
 * GET /api/whatsapp/user-context?phone=5521XXXXXXXX
 * Chamado pelo n8n (bot WhatsApp IA) para identificar quem está enviando mensagem.
 * Busca por telefone normalizado em users e leads.
 * Retorna contexto para personalizar resposta da IA.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET

// Normaliza phone para comparação: remove DDI 55 e não-dígitos
function normalizePhone(phone: string): string[] {
  const digits = (phone || '').replace(/\D/g, '')
  const candidates: string[] = []
  if (digits.length === 13 && digits.startsWith('55')) {
    const sem55 = digits.slice(2)
    candidates.push(sem55)
    candidates.push(`(${sem55.slice(0, 2)}) ${sem55.slice(2, 7)}-${sem55.slice(7)}`)
    candidates.push(`(${sem55.slice(0, 2)}) ${sem55.slice(2, 6)}-${sem55.slice(6)}`)
  }
  candidates.push(digits)
  return candidates
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-n8n-secret')
  if (!N8N_SECRET || secret !== N8N_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const phone = req.nextUrl.searchParams.get('phone') ?? ''
  if (!phone) return NextResponse.json({ perfil_tipo: 'desconhecido', nome: 'Visitante' })

  try {
    const candidates = normalizePhone(phone)

    const user = await prisma.user.findFirst({
      where: { phone: { in: candidates } },
      select: { id: true, name: true, subscriptionPlan: true, subscriptionExpiresAt: true, status: true },
    })

    if (user) {
      const now = new Date()
      const expires = user.subscriptionExpiresAt
      const expired = expires ? expires < now : false
      const plan = expired ? 'free' : (user.subscriptionPlan ?? 'free')

      let perfil_tipo: string
      if (plan === 'premium') perfil_tipo = 'cliente_premium'
      else if (plan === 'pro') perfil_tipo = 'cliente_pro'
      else if (plan === 'basic') perfil_tipo = 'cliente_basic'
      else perfil_tipo = 'cliente_free'

      return NextResponse.json({
        perfil_tipo,
        user_id: user.id,
        nome: user.name ?? 'MEI',
        plano: plan,
        expiracao: expires ? expires.toLocaleDateString('pt-BR') : null,
        plano_expirado: expired,
      })
    }

    const lead = await prisma.lead.findFirst({
      where: { phone: { in: candidates } },
      select: { id: true, name: true, status: true },
    })

    if (lead) {
      return NextResponse.json({
        perfil_tipo: 'lead',
        nome: lead.name ?? 'Visitante',
        plano: null,
        expiracao: null,
        plano_expirado: false,
      })
    }

    return NextResponse.json({
      perfil_tipo: 'desconhecido',
      nome: 'Visitante',
      plano: null,
      expiracao: null,
      plano_expirado: false,
    })
  } catch {
    return NextResponse.json({ perfil_tipo: 'desconhecido', nome: 'Visitante' })
  }
}
