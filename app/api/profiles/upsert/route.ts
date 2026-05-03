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

    const { error } = await supabase.from('profiles').upsert(
      { id, name, email, phone, city, role: 'user', status: 'active', subscription_plan: 'free', updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
