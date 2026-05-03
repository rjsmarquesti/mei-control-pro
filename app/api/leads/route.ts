export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceClient()
    const { name, email, phone, city, status = 'novo', notes = '' } = await req.json()

    if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })

    const { error } = await supabase.from('leads').upsert(
      { name, email, phone, city, status, notes, updated_at: new Date().toISOString() },
      { onConflict: 'email' }
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
