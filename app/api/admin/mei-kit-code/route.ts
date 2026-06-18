import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const SALT = process.env.MEI_ACTIVATION_SALT ?? 'mei-kit-2026-prod'

export async function POST(req: NextRequest) {
  // Verifica autenticação admin
  const userId = await getUserFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Verifica se é admin
  const supabase = getServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email) {
    return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })
  }

  const emailNorm = String(email).toLowerCase().trim()
  const code = createHmac('sha256', SALT).update(emailNorm).digest('hex').slice(0, 8).toUpperCase()

  return NextResponse.json({ email: emailNorm, code })
}
