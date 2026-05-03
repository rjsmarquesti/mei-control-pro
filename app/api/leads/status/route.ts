export const dynamic = 'force-dynamic'

/**
 * GET /api/leads/status?email=xxx
 * Chamado pelo n8n (workflow nutrição de leads) para verificar se lead converteu.
 * Se o email já existe em profiles → status: 'convertido'
 * Caso contrário → retorna status atual da tabela leads
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })
  }

  try {
    const supabase = getServiceClient()

    // Verifica se virou cliente (existe em profiles)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, subscription_plan, status')
      .eq('email', email)
      .maybeSingle()

    if (profile) {
      return NextResponse.json({
        status: 'convertido',
        plan: profile.subscription_plan ?? 'free',
        userId: profile.id,
      })
    }

    // Verifica status na tabela leads
    const { data: lead } = await supabase
      .from('leads')
      .select('id, status, created_at')
      .eq('email', email)
      .maybeSingle()

    if (!lead) {
      return NextResponse.json({ status: 'nao_encontrado' })
    }

    return NextResponse.json({ status: lead.status, leadId: lead.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
