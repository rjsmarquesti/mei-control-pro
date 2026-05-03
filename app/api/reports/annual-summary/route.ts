export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET
const MEI_LIMITE_ANUAL = Number(process.env.MEI_LIMITE_ANUAL ?? 81000)

function formatPhone(phone: string): string {
  const d = (phone || '').replace(/\D/g, '')
  if (d.length === 11) return '55' + d
  if (d.length === 13) return d
  if (d.length > 8) return '55' + d
  return ''
}

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-n8n-secret')
  if (N8N_SECRET && secret !== N8N_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({})) as { year?: string }

    const now = new Date()
    const defaultYear = String(now.getFullYear() - 1)
    const year = body.year ?? defaultYear

    const start = `${year}-01-01`
    const end = `${year}-12-31`

    const supabase = getServiceClient()

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, name, email, phone, cnpj')
      .in('subscription_plan', ['basic', 'pro', 'premium'])
      .eq('status', 'active')

    if (profErr) throw new Error(profErr.message)
    if (!profiles?.length) return NextResponse.json({ ok: true, year, data: [] })

    const results = []

    for (const p of profiles) {
      // Receitas anuais por mês
      const { data: revAll } = await supabase
        .from('transactions')
        .select('value, date')
        .eq('user_id', p.id)
        .eq('type', 'revenue')
        .gte('date', start)
        .lte('date', end)

      // Despesas anuais
      const { data: expAll } = await supabase
        .from('transactions')
        .select('value, date')
        .eq('user_id', p.id)
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end)

      // DAS do ano
      const { data: dasAll } = await supabase
        .from('das_payments')
        .select('value, status, competencia')
        .eq('user_id', p.id)
        .gte('competencia', `${year}-01`)
        .lte('competencia', `${year}-12`)

      const receita_anual = (revAll ?? []).reduce((acc, t) => acc + Number(t.value), 0)
      const despesas_anuais = (expAll ?? []).reduce((acc, t) => acc + Number(t.value), 0)
      const lucro_anual = receita_anual - despesas_anuais

      const das_pago = (dasAll ?? [])
        .filter(d => d.status === 'paid')
        .reduce((acc, d) => acc + Number(d.value), 0)
      const das_pendentes_count = (dasAll ?? []).filter(d => d.status !== 'paid').length

      const percentual_limite = Math.min(
        Math.round((receita_anual / MEI_LIMITE_ANUAL) * 100),
        100
      )
      const excedeu_limite = receita_anual > MEI_LIMITE_ANUAL

      // Detectar meses sem lançamento
      const mesesComLancamento = new Set([
        ...(revAll ?? []).map(t => t.date?.slice(0, 7)),
        ...(expAll ?? []).map(t => t.date?.slice(0, 7)),
      ])
      const meses_sem_lancamentos: string[] = []
      for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}`
        if (!mesesComLancamento.has(key)) meses_sem_lancamentos.push(key)
      }

      // Alertas inteligentes
      const alertas: string[] = []
      if (excedeu_limite) alertas.push('limite_excedido')
      else if (percentual_limite >= 75) alertas.push('limite_proximo')
      if (das_pendentes_count > 0) alertas.push(`das_pendentes:${das_pendentes_count}`)
      if (lucro_anual < 0) alertas.push('prejuizo')
      if (meses_sem_lancamentos.length >= 3) alertas.push(`meses_sem_lancamentos:${meses_sem_lancamentos.length}`)

      // IRPF: MEI é isento se receita <= 81k (regra simplificada)
      const irpf_isento = receita_anual <= MEI_LIMITE_ANUAL
      const irpf_valor_tributavel = irpf_isento ? 0 : receita_anual - MEI_LIMITE_ANUAL
      const irpf_valor_isento = irpf_isento ? receita_anual : MEI_LIMITE_ANUAL

      const phoneWA = formatPhone(p.phone ?? '')

      results.push({
        userId: p.id,
        nome: p.name ?? 'MEI',
        email: p.email ?? '',
        phone: p.phone ?? '',
        phoneWA,
        hasPhone: phoneWA.length >= 12,
        cnpj: p.cnpj ?? '',
        ano: year,
        receita_anual: receita_anual.toFixed(2),
        receita_anual_fmt: formatBRL(receita_anual),
        despesas_anuais: despesas_anuais.toFixed(2),
        despesas_anuais_fmt: formatBRL(despesas_anuais),
        lucro_anual: lucro_anual.toFixed(2),
        lucro_anual_fmt: formatBRL(Math.abs(lucro_anual)),
        lucro_positivo: lucro_anual >= 0,
        das_pago: das_pago.toFixed(2),
        das_pago_fmt: formatBRL(das_pago),
        das_pendentes_count,
        percentual_limite,
        limite_mei: MEI_LIMITE_ANUAL,
        excedeu_limite,
        meses_sem_lancamentos,
        alertas,
        // IRPF
        irpf_isento,
        irpf_valor_isento: irpf_valor_isento.toFixed(2),
        irpf_valor_isento_fmt: formatBRL(irpf_valor_isento),
        irpf_valor_tributavel: irpf_valor_tributavel.toFixed(2),
        irpf_valor_tributavel_fmt: formatBRL(irpf_valor_tributavel),
        irpf_prazo: `31 de maio de ${Number(year) + 1}`,
      })
    }

    return NextResponse.json({ ok: true, year, data: results })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
