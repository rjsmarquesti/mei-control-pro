import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getServiceClient } from '@/lib/supabase-server'
import { signEletToken } from '@/lib/elet-token'

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
  const SALT = process.env.ELET_ACTIVATION_SALT
  if (!SALT) return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 503, headers: CORS })

  try {
    const { email, codigo } = await req.json()

    if (!email || !codigo) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400, headers: CORS })
    }

    const emailNorm = String(email).toLowerCase().trim()
    const codigoNorm = String(codigo).trim().toUpperCase()

    const expected = createHmac('sha256', SALT).update(emailNorm).digest('hex').slice(0, 8).toUpperCase()
    if (codigoNorm !== expected) {
      return NextResponse.json({ error: 'Código inválido.' }, { status: 401, headers: CORS })
    }

    const supabase = getServiceClient()
    await supabase.from('elet_activations').insert({
      email: emailNorm,
      activated_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
    })

    const token = signEletToken(emailNorm)
    return NextResponse.json({ token }, { status: 200, headers: CORS })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500, headers: CORS })
  }
}
