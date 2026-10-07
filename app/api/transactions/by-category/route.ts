export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const CATEGORY_COLORS: Record<string, string> = {
  Serviços: '#7C3AED',
  Consultoria: '#06B6D4',
  Projetos: '#10B981',
  Infraestrutura: '#F59E0B',
  Material: '#EF4444',
  Tecnologia: '#8B5CF6',
  Outros: '#6B7280',
}

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const year = new Date().getFullYear()
  const rows = await prisma.transaction.groupBy({
    by: ['category'],
    where: { userId, type: 'revenue', status: 'completed', date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } },
    _sum: { value: true },
  })

  const totals = rows.map(r => ({ name: r.category, amount: Number(r._sum.value ?? 0) }))
  const total = totals.reduce((s, t) => s + t.amount, 0)
  if (total === 0) return NextResponse.json([])

  return NextResponse.json(
    totals
      .sort((a, b) => b.amount - a.amount)
      .map(t => ({ name: t.name, amount: t.amount, value: Math.round((t.amount / total) * 100), color: CATEGORY_COLORS[t.name] ?? '#6B7280' }))
  )
}
