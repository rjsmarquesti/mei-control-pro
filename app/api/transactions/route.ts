export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function serialize(t: { id: bigint; value: unknown }) {
  return { ...t, id: String(t.id) }
}

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const year = req.nextUrl.searchParams.get('year')
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '20')

  const transactions = await prisma.transaction.findMany({
    where: year ? { userId, date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } } : { userId },
    orderBy: { date: 'desc' },
    take: year ? undefined : limit,
  })

  return NextResponse.json(transactions.map(serialize))
}

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const type = body.type === 'expense' ? 'expense' : 'revenue'

    if (type === 'revenue' || type === 'expense') {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionPlan: true } })
      if (user?.subscriptionPlan === 'free') {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        const count = await prisma.transaction.count({ where: { userId, date: { gte: start, lte: end } } })
        if (count >= 100) {
          return NextResponse.json({ error: 'Limite de 100 lançamentos por mês atingido. Faça upgrade para continuar.' }, { status: 403 })
        }
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type,
        description: body.description,
        category: body.category ?? (type === 'revenue' ? 'Serviços' : 'Outros'),
        value: body.value,
        date: body.date ? new Date(body.date) : new Date(),
        status: body.status ?? 'completed',
      },
    })

    return NextResponse.json(serialize(transaction))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
