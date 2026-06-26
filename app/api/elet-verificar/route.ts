import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { verifyEletToken } from '@/lib/elet-token'

export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: 'Token ausente.' }, { status: 400, headers: CORS })
    }

    const payload = verifyEletToken(String(token))
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401, headers: CORS })
    }

    const supabase = getServiceClient()
    const { data } = await supabase
      .from('elet_activations')
      .select('revoked')
      .eq('email', payload.email)
      .eq('revoked', false)
      .limit(1)
      .single()

    if (!data) {
      return NextResponse.json({ error: 'Licença revogada ou não encontrada.' }, { status: 403, headers: CORS })
    }

    await supabase
      .from('elet_activations')
      .update({ last_verified_at: new Date().toISOString() })
      .eq('email', payload.email)
      .eq('revoked', false)

    return NextResponse.json({ ok: true, email: payload.email }, { status: 200, headers: CORS })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500, headers: CORS })
  }
}
