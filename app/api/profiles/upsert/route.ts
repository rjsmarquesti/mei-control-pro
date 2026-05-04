export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, getUserFromRequest } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const authenticatedId = await getUserFromRequest(req)
    if (!authenticatedId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const supabase = getServiceClient()
    const { id, name, email, phone, city } = await req.json()

    if (!id || !email) return NextResponse.json({ error: 'id e email obrigatórios' }, { status: 400 })

    // Garante que o id do body pertence ao usuário autenticado
    if (id !== authenticatedId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const trialExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const now = new Date().toISOString()

    // Verifica se já existe profile (upsert em novo usuário vs. atualização)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .single()

    const isNew = !existing

    const upsertData: Record<string, unknown> = {
      id,
      name: name || null,
      email,
      phone: phone || null,
      city: city || null,
      role: 'user',
      updated_at: now,
    }

    if (isNew) {
      // Novo usuário: trial premium 7 dias
      upsertData.status = 'active'
      upsertData.subscription_plan = 'premium'
      upsertData.subscription_expires_at = trialExpires
      upsertData.is_trial = true
      upsertData.trial_started_at = now
    }

    const { error } = await supabase.from('profiles').upsert(upsertData, { onConflict: 'id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
