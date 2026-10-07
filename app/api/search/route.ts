export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ transactions: [], dasPayments: [], categories: [] })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ transactions: [], dasPayments: [], categories: [] })

  const [transactions, dasPayments, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, description: { contains: q, mode: 'insensitive' } },
      select: { id: true, description: true, category: true, value: true, type: true, date: true },
      take: 5,
    }),
    prisma.dasPayment.findMany({ where: { userId }, select: { id: true, dueDate: true, value: true, status: true }, take: 3 }),
    prisma.category.findMany({
      where: { userId, name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, type: true },
      take: 3,
    }),
  ])

  return NextResponse.json({
    transactions: transactions.map(t => ({ ...t, id: t.id.toString(), date: t.date.toISOString().slice(0, 10) })),
    dasPayments: dasPayments.map(d => ({ ...d, id: d.id.toString(), due_date: d.dueDate.toISOString().slice(0, 10) })),
    categories,
  })
}
