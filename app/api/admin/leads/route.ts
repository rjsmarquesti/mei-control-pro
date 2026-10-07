export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const leads = await prisma.lead.findMany({
    where: { status: { in: ['novo', 'contatado', 'perdido'] } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(leads)
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    await prisma.lead.update({ where: { id }, data: updates })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    await prisma.lead.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
