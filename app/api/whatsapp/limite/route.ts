export const dynamic = 'force-dynamic'

/**
 * GET /api/whatsapp/limite?userId=xxx
 * Chamado pelo n8n (bot WhatsApp) para retornar faturamento anual vs limite MEI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

const MEI_LIMITE_ANUAL = Number(process.env.MEI_LIMITE_ANUAL ?? 81000)
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET ?? ''

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-n8n-secret') ?? ''
  if (N8N_SECRET && secret !== N8N_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = req.nextUrl.searchParams.get('userId') ?? ''
  if (!userId) return NextResponse.json({ ok: true, found: false })

  try {
    const supabase = getServiceClient()
    const year = new Date().getFullYear().toString()

    const { data: anual } = await supabase
      .from('transactions')
      .select('value')
      .eq('user_id', userId)
      .eq('type', 'revenue')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)

    const receita_anual = (anual ?? []).reduce((acc, t) => acc + Number(t.value), 0)
    const percentual = Math.min(Math.round((receita_anual / MEI_LIMITE_ANUAL) * 100), 100)
    const restante = Math.max(MEI_LIMITE_ANUAL - receita_anual, 0)

    return NextResponse.json({
      ok: true,
      found: true,
      ano: year,
      receita_anual_fmt: `R$ ${receita_anual.toFixed(2).replace('.', ',')}`,
      limite_fmt: `R$ ${MEI_LIMITE_ANUAL.toLocaleString('pt-BR')},00`,
      restante_fmt: `R$ ${restante.toFixed(2).replace('.', ',')}`,
      percentual_limite: percentual,
    })
  } catch {
    return NextResponse.json({ ok: false, found: false })
  }
}
