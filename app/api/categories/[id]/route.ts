export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { name } = await req.json()
    const { count } = await prisma.category.updateMany({ where: { id: params.id, userId }, data: { name } })
    if (count === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { count } = await prisma.category.deleteMany({ where: { id: params.id, userId } })
  if (count === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
