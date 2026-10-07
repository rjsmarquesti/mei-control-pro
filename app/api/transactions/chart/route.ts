export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const year = new Date().getFullYear()
  const rows = await prisma.transaction.findMany({
    where: { userId, status: 'completed', date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } },
    select: { date: true, type: true, value: true },
  })

  const grouped: Record<number, { receita: number; despesa: number }> = {}
  for (let m = 0; m < 12; m++) grouped[m] = { receita: 0, despesa: 0 }

  for (const row of rows) {
    const month = row.date.getUTCMonth()
    if (row.type === 'revenue') grouped[month].receita += Number(row.value)
    else grouped[month].despesa += Number(row.value)
  }

  return NextResponse.json(Object.entries(grouped).map(([m, v]) => ({
    month: MONTHS[Number(m)],
    receita: v.receita,
    despesa: v.despesa,
    lucro: v.receita - v.despesa,
  })))
}
