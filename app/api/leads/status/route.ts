export const dynamic = 'force-dynamic'

/**
 * GET /api/leads/status?email=xxx
 * Chamado pelo n8n (workflow nutrição de leads) para verificar se lead converteu.
 * Se o email já existe em users → status: 'convertido'
 * Caso contrário → retorna status atual da tabela leads
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-n8n-secret')
  if (!N8N_SECRET || secret !== N8N_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = req.nextUrl.searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, subscriptionPlan: true, status: true },
    })

    if (user) {
      return NextResponse.json({
        status: 'convertido',
        plan: user.subscriptionPlan ?? 'free',
        userId: user.id,
      })
    }

    const lead = await prisma.lead.findUnique({
      where: { email },
      select: { id: true, status: true, createdAt: true },
    })

    if (!lead) {
      return NextResponse.json({ status: 'nao_encontrado' })
    }

    return NextResponse.json({ status: lead.status, leadId: lead.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
