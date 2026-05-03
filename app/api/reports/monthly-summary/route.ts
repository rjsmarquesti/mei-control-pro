export const dynamic = 'force-dynamic'

/**
 * POST /api/reports/monthly-summary
 * Chamado pelo n8n (cron dia 1 do mês) para gerar resumo financeiro mensal.
 * Requer header x-n8n-secret para autenticação.
 *
 * Body: { month?: 'YYYY-MM' } — padrão: mês anterior
 * Retorna: { ok, month, data: [...] } onde data é array de usuários com resumo
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET
const MEI_LIMITE_ANUAL = Number(process.env.MEI_LIMITE_ANUAL ?? 81000)

function getMonthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  const end = new Date(y, m, 0) // último dia do mês
  return {
    start: `${month}-01`,
    end: end.toISOString().split('T')[0],
  }
}

function formatPhone(phone: string): string {
  const d = (phone || '').replace(/\D/g, '')
  if (d.length === 11) return '55' + d
  if (d.length === 13) return d
  if (d.length > 8) return '55' + d
  return ''
}

function formatMonthName(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-n8n-secret')
  if (N8N_SECRET && secret !== N8N_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({})) as { month?: string }

    // Mês anterior como padrão
    const now = new Date()
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const defaultMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    const month = body.month ?? defaultMonth
    const { start, end } = getMonthRange(month)
    const mesNome = formatMonthName(month)
    const year = month.split('-')[0]

    const supabase = getServiceClient()

    // Todos os assinantes pagantes ativos
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, name, email, phone, cnpj')
      .in('subscription_plan', ['basic', 'pro', 'premium'])
      .eq('status', 'active')

    if (profErr) throw new Error(profErr.message)
    if (!profiles?.length) return NextResponse.json({ ok: true, month, data: [] })

    const results = []

    for (const p of profiles) {
      // Receitas do mês
      const { data: rev } = await supabase
        .from('transactions')
        .select('value')
        .eq('user_id', p.id)
        .eq('type', 'revenue')
        .gte('date', start)
        .lte('date', end)

      const receitas = (rev ?? []).reduce((acc, t) => acc + Number(t.value), 0)

      // Despesas do mês
      const { data: exp } = await supabase
        .from('transactions')
        .select('value')
        .eq('user_id', p.id)
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end)

      const despesas = (exp ?? []).reduce((acc, t) => acc + Number(t.value), 0)

      // DAS do mês (competencia = 'YYYY-MM')
      const { data: das } = await supabase
        .from('das_payments')
        .select('value, status')
        .eq('user_id', p.id)
        .eq('competencia', month)

      const das_pagas = (das ?? [])
        .filter(d => d.status === 'paid')
        .reduce((acc, d) => acc + Number(d.value), 0)
      const das_pendentes = (das ?? [])
        .filter(d => d.status !== 'paid')
        .reduce((acc, d) => acc + Number(d.value), 0)
      const das_status = das_pagas > 0 ? 'paga' : das_pendentes > 0 ? 'pendente' : 'sem registros'

      // Receita anual acumulada (para % limite MEI)
      const { data: anual } = await supabase
        .from('transactions')
        .select('value')
        .eq('user_id', p.id)
        .eq('type', 'revenue')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)

      const receita_anual = (anual ?? []).reduce((acc, t) => acc + Number(t.value), 0)
      const percentual_limite = Math.min(
        Math.round((receita_anual / MEI_LIMITE_ANUAL) * 100),
        100
      )

      const phoneWA = formatPhone(p.phone ?? '')
      const saldo = receitas - despesas

      // Mensagem motivacional se sem lançamentos
      const sem_lancamentos = receitas === 0 && despesas === 0

      results.push({
        userId: p.id,
        nome: p.name ?? 'MEI',
        email: p.email ?? '',
        phone: p.phone ?? '',
        phoneWA,
        hasPhone: phoneWA.length >= 12,
        cnpj: p.cnpj ?? '',
        mes: month,
        mesNome,
        sem_lancamentos,
        receitas: receitas.toFixed(2),
        receitas_fmt: `R$ ${receitas.toFixed(2).replace('.', ',')}`,
        despesas: despesas.toFixed(2),
        despesas_fmt: `R$ ${despesas.toFixed(2).replace('.', ',')}`,
        saldo: saldo.toFixed(2),
        saldo_fmt: `R$ ${Math.abs(saldo).toFixed(2).replace('.', ',')}`,
        saldo_positivo: saldo >= 0,
        das_pagas: das_pagas.toFixed(2),
        das_pagas_fmt: `R$ ${das_pagas.toFixed(2).replace('.', ',')}`,
        das_pendentes: das_pendentes.toFixed(2),
        das_pendentes_fmt: `R$ ${das_pendentes.toFixed(2).replace('.', ',')}`,
        das_status,
        receita_anual: receita_anual.toFixed(2),
        receita_anual_fmt: `R$ ${receita_anual.toFixed(2).replace('.', ',')}`,
        percentual_limite,
        limite_mei: MEI_LIMITE_ANUAL,
      })
    }

    return NextResponse.json({ ok: true, month, data: results })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
