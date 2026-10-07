export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const { count } = await prisma.transaction.updateMany({
      where: { id: BigInt(params.id), userId },
      data: {
        description: body.description,
        category: body.category,
        value: body.value,
        date: body.date ? new Date(body.date) : undefined,
        status: body.status,
      },
    })
    if (count === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const updated = await prisma.transaction.findUnique({ where: { id: BigInt(params.id) } })
    return NextResponse.json({ ...updated, id: params.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { count } = await prisma.transaction.deleteMany({ where: { id: BigInt(params.id), userId } })
    if (count === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
