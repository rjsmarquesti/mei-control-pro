export const dynamic = 'force-dynamic'

/**
 * GET /api/whatsapp/faturamento?userId=xxx&month=YYYY-MM
 * Chamado pelo n8n (bot WhatsApp) para retornar resumo financeiro de um usuário específico.
 * month é opcional — padrão: mês atual.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const MEI_LIMITE_ANUAL = Number(process.env.MEI_LIMITE_ANUAL ?? 81000)

function getMonthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number)
  return { start: new Date(`${month}-01`), end: new Date(y, m, 0) }
}

function formatMonthName(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function fmt(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET ?? ''

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-n8n-secret') ?? ''
  if (!N8N_SECRET || secret !== N8N_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = req.nextUrl.searchParams.get('userId') ?? ''
  if (!userId) return NextResponse.json({ ok: true, found: false })

  try {
    const now = new Date()
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const month = req.nextUrl.searchParams.get('month') ?? defaultMonth
    const { start, end } = getMonthRange(month)
    const mesNome = formatMonthName(month)
    const year = month.split('-')[0]

    const [rev, exp, das, anual] = await Promise.all([
      prisma.transaction.aggregate({ where: { userId, type: 'revenue', date: { gte: start, lte: end } }, _sum: { value: true } }),
      prisma.transaction.aggregate({ where: { userId, type: 'expense', date: { gte: start, lte: end } }, _sum: { value: true } }),
      prisma.dasPayment.findMany({ where: { userId, competencia: month }, select: { value: true, status: true } }),
      prisma.transaction.aggregate({ where: { userId, type: 'revenue', date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } }, _sum: { value: true } }),
    ])

    const receitas = Number(rev._sum.value ?? 0)
    const despesas = Number(exp._sum.value ?? 0)
    const saldo = receitas - despesas

    const das_pagas = das.filter(d => d.status === 'paid').reduce((acc, d) => acc + Number(d.value), 0)
    const das_pendentes = das.filter(d => d.status !== 'paid').reduce((acc, d) => acc + Number(d.value), 0)
    const das_status = das_pagas > 0 ? 'paga ✅' : das_pendentes > 0 ? 'pendente ⚠️' : 'sem registros'

    const receita_anual = Number(anual._sum.value ?? 0)
    const percentual_limite = Math.min(Math.round((receita_anual / MEI_LIMITE_ANUAL) * 100), 100)

    return NextResponse.json({
      ok: true,
      found: true,
      mes: month,
      mesNome,
      sem_lancamentos: receitas === 0 && despesas === 0,
      receitas_fmt: fmt(receitas),
      despesas_fmt: fmt(despesas),
      saldo_fmt: fmt(Math.abs(saldo)),
      saldo_positivo: saldo >= 0,
      das_status,
      percentual_limite,
    })
  } catch {
    return NextResponse.json({ ok: false, found: false })
  }
}
