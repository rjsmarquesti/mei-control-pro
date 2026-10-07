import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMeiToken } from '@/lib/mei-token'

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

    const payload = verifyMeiToken(String(token))
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401, headers: CORS })
    }

    const activation = await prisma.activation.findFirst({
      where: { email: payload.email, revoked: false },
      select: { id: true },
    })

    if (!activation) {
      return NextResponse.json({ error: 'Licença revogada ou não encontrada.' }, { status: 403, headers: CORS })
    }

    await prisma.activation.updateMany({
      where: { email: payload.email, revoked: false },
      data: { lastVerifiedAt: new Date() },
    })

    return NextResponse.json({ ok: true, email: payload.email }, { status: 200, headers: CORS })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500, headers: CORS })
  }
}
