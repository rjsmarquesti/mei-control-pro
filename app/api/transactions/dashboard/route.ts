export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function monthRange() {
  const now = new Date()
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  }
}

function yearRange() {
  const year = new Date().getFullYear()
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59) }
}

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { start: monthStart, end: monthEnd } = monthRange()
  const { start: yearStart, end: yearEnd } = yearRange()

  const [monthRev, monthExp, yearRev, das] = await Promise.all([
    prisma.transaction.aggregate({ where: { userId, type: 'revenue', status: 'completed', date: { gte: monthStart, lte: monthEnd } }, _sum: { value: true } }),
    prisma.transaction.aggregate({ where: { userId, type: 'expense', status: 'completed', date: { gte: monthStart, lte: monthEnd } }, _sum: { value: true } }),
    prisma.transaction.aggregate({ where: { userId, type: 'revenue', status: 'completed', date: { gte: yearStart, lte: yearEnd } }, _sum: { value: true } }),
    prisma.dasPayment.findFirst({ where: { userId, status: 'pending' }, orderBy: { dueDate: 'asc' } }),
  ])

  const monthRevenue = Number(monthRev._sum.value ?? 0)
  const monthExpenses = Number(monthExp._sum.value ?? 0)
  const annualRevenue = Number(yearRev._sum.value ?? 0)
  const netProfit = monthRevenue - monthExpenses

  return NextResponse.json({
    monthRevenue,
    annualRevenue,
    monthExpenses,
    netProfit,
    meiLimit: 81000,
    meiUsed: annualRevenue,
    dasValue: das ? Number(das.value) : 70.6,
    dasDueDate: das?.dueDate?.toISOString().slice(0, 10) ?? '',
    monthRevenueGrowth: 0,
    monthExpensesGrowth: 0,
    netProfitGrowth: netProfit > 0 && monthRevenue > 0 ? Math.round((netProfit / monthRevenue) * 100) : 0,
  })
}
