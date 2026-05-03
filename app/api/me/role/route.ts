import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, getUserFromRequest } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserFromRequest(req)
    if (!userId) return NextResponse.json({ role: 'user' })

    const supabase = getServiceClient()
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    // Registra último acesso para detecção de inatividade (lifecycle P3)
    supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId)
      .then(() => {/* fire and forget */})

    return NextResponse.json({ role: data?.role ?? 'user' })
  } catch {
    return NextResponse.json({ role: 'user' })
  }
}
