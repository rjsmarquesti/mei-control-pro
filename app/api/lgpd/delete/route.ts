export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logSecurityEvent } from '@/lib/audit'

// Período de carência antes da exclusão efetiva
const GRACE_DAYS = 30

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserFromRequest(req)
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // Verifica se já existe solicitação pendente
    const existing = await prisma.lgpdRequest.findFirst({
      where: { userId, type: 'deletion', status: { in: ['pending', 'processing'] } },
      select: { id: true, status: true, requestedAt: true },
    })

    if (existing) {
      return NextResponse.json({
        ok: false,
        message: 'Já existe uma solicitação de exclusão em andamento.',
        requested_at: existing.requestedAt,
      }, { status: 409 })
    }

    const deletionDate = new Date()
    deletionDate.setDate(deletionDate.getDate() + GRACE_DAYS)

    await Promise.all([
      prisma.user.update({ where: { id: userId }, data: { status: 'deletion_requested' } }),
      prisma.lgpdRequest.create({
        data: {
          userId,
          type: 'deletion',
          status: 'pending',
          notes: `Exclusão agendada para ${deletionDate.toISOString().slice(0, 10)} (${GRACE_DAYS} dias de carência)`,
        },
      }),
    ])

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

    await logSecurityEvent({
      userId,
      action: 'lgpd_deletion_request',
      entity_type: 'user_data',
      entity_id: userId,
      ip,
      user_agent: req.headers.get('user-agent') ?? null,
      after_data: { scheduled_deletion: deletionDate.toISOString() },
    })

    return NextResponse.json({
      ok: true,
      message: `Solicitação registrada. Seus dados serão excluídos em ${GRACE_DAYS} dias (${deletionDate.toISOString().slice(0, 10)}). Você pode cancelar antes disso entrando em contato com suporte@sismeipro.com.br.`,
      scheduled_deletion: deletionDate.toISOString(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
