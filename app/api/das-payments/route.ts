export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function serialize(d: { id: bigint; dueDate: Date; paidAt: Date | null }) {
  return {
    ...d,
    id: String(d.id),
    due_date: d.dueDate.toISOString().slice(0, 10),
    paid_at: d.paidAt ? d.paidAt.toISOString() : null,
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const list = await prisma.dasPayment.findMany({ where: { userId }, orderBy: { dueDate: 'desc' } })
  return NextResponse.json(list.map(serialize))
}

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.value || !body.due_date) {
      return NextResponse.json({ error: 'value e due_date são obrigatórios' }, { status: 400 })
    }

    const dueDate = new Date(body.due_date)
    const status = body.status ?? (dueDate < new Date() ? 'overdue' : 'pending')

    const das = await prisma.dasPayment.create({
      data: {
        userId,
        competencia: body.competencia || null,
        value: body.value,
        dueDate,
        status,
        paidAt: status === 'paid' ? new Date() : null,
      },
    })

    return NextResponse.json(serialize(das))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
