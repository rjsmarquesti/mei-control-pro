export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

function decodeJwt(token: string): { sub?: string; exp?: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { password, accessToken } = await req.json()

    if (!password || !accessToken) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Decode JWT locally — sem chamada de rede
    const payload = decodeJwt(accessToken)

    if (!payload?.sub) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return NextResponse.json({ error: 'Link expirado. Solicite um novo link de recuperação.' }, { status: 401 })
    }

    const supabase = getServiceClient()

    const { error } = await supabase.auth.admin.updateUserById(payload.sub, { password })

    if (error) {
      console.error('[update-password]', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[update-password] exception:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
