import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'
import { signMeiToken } from '@/lib/mei-token'

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
  const SALT = process.env.MEI_ACTIVATION_SALT
  if (!SALT) return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 503, headers: CORS })

  try {
    const { email, codigo } = await req.json()

    if (!email || !codigo) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400, headers: CORS })
    }

    const emailNorm = String(email).toLowerCase().trim()
    const codigoNorm = String(codigo).trim().toUpperCase()

    // Valida HMAC server-side (SALT nunca exposto no APK)
    const expected = createHmac('sha256', SALT).update(emailNorm).digest('hex').slice(0, 8).toUpperCase()
    if (codigoNorm !== expected) {
      return NextResponse.json({ error: 'Código inválido.' }, { status: 401, headers: CORS })
    }

    // Registra ativação no banco
    await prisma.activation.create({ data: { email: emailNorm } })

    const token = signMeiToken(emailNorm)
    return NextResponse.json({ token }, { status: 200, headers: CORS })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500, headers: CORS })
  }
}
