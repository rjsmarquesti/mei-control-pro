export const dynamic = 'force-dynamic'

/**
 * PATCH /api/lifecycle/mark-notified
 * Chamado pelo n8n após envio de cada notificação lifecycle.
 * Atualiza lifecycle_notified[tipo] = now() para evitar spam.
 *
 * Body: { userId: string, tipo: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET

export async function PATCH(req: NextRequest) {
  const secret = req.headers.get('x-n8n-secret')
  if (!N8N_SECRET || secret !== N8N_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userId, tipo } = await req.json() as { userId: string; tipo: string }
    if (!userId || !tipo) {
      return NextResponse.json({ error: 'userId e tipo são obrigatórios' }, { status: 400 })
    }

    // Busca o notified atual para fazer merge (não sobrescrever outros tipos)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { lifecycleNotified: true } })

    const current = (user?.lifecycleNotified as Record<string, string>) ?? {}
    const updated = { ...current, [tipo]: new Date().toISOString() }

    await prisma.user.update({
      where: { id: userId },
      data: { lifecycleNotified: updated as Prisma.InputJsonValue },
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
