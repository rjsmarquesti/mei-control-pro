export const dynamic = 'force-dynamic'

/**
 * GET /api/whatsapp/faturamento?userId=xxx&month=YYYY-MM
 * Chamado pelo n8n (bot WhatsApp) para retornar resumo financeiro de um usuário específico.
 * month é opcional — padrão: mês atual.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

const MEI_LIMITE_ANUAL = Number(process.env.MEI_LIMITE_ANUAL ?? 81000)

function getMonthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  const end = new Date(y, m, 0)
  return { start: `${month}-01`, end: end.toISOString().split('T')[0] }
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
  if (N8N_SECRET && secret !== N8N_SECRET) {
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

    const supabase = getServiceClient()

    const [{ data: rev }, { data: exp }, { data: das }, { data: anual }] = await Promise.all([
      supabase.from('transactions').select('value').eq('user_id', userId).eq('type', 'revenue').gte('date', start).lte('date', end),
      supabase.from('transactions').select('value').eq('user_id', userId).eq('type', 'expense').gte('date', start).lte('date', end),
      supabase.from('das_payments').select('value, status').eq('user_id', userId).eq('competencia', month),
      supabase.from('transactions').select('value').eq('user_id', userId).eq('type', 'revenue').gte('date', `${year}-01-01`).lte('date', `${year}-12-31`),
    ])

    const receitas = (rev ?? []).reduce((acc, t) => acc + Number(t.value), 0)
    const despesas = (exp ?? []).reduce((acc, t) => acc + Number(t.value), 0)
    const saldo = receitas - despesas

    const das_pagas = (das ?? []).filter(d => d.status === 'paid').reduce((acc, d) => acc + Number(d.value), 0)
    const das_pendentes = (das ?? []).filter(d => d.status !== 'paid').reduce((acc, d) => acc + Number(d.value), 0)
    const das_status = das_pagas > 0 ? 'paga ✅' : das_pendentes > 0 ? 'pendente ⚠️' : 'sem registros'

    const receita_anual = (anual ?? []).reduce((acc, t) => acc + Number(t.value), 0)
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
