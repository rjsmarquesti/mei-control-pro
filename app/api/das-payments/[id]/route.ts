export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if ('status' in body) data.status = body.status
    if ('paid_at' in body) data.paidAt = body.paid_at ? new Date(body.paid_at) : null

    const { count } = await prisma.dasPayment.updateMany({ where: { id: BigInt(params.id), userId }, data })
    if (count === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
