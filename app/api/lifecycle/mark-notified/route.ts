export const dynamic = 'force-dynamic'

/**
 * PATCH /api/lifecycle/mark-notified
 * Chamado pelo n8n após envio de cada notificação lifecycle.
 * Atualiza lifecycle_notified[tipo] = now() para evitar spam.
 *
 * Body: { userId: string, tipo: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET

export async function PATCH(req: NextRequest) {
  const secret = req.headers.get('x-n8n-secret')
  if (N8N_SECRET && secret !== N8N_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userId, tipo } = await req.json() as { userId: string; tipo: string }
    if (!userId || !tipo) {
      return NextResponse.json({ error: 'userId e tipo são obrigatórios' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Busca o notified atual para fazer merge (não sobrescrever outros tipos)
    const { data: profile } = await supabase
      .from('profiles')
      .select('lifecycle_notified')
      .eq('id', userId)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current: Record<string, string> = (profile?.lifecycle_notified as any) ?? {}
    const updated = { ...current, [tipo]: new Date().toISOString() }

    const { error } = await supabase
      .from('profiles')
      .update({ lifecycle_notified: updated, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
