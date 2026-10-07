export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { revokeRefreshToken } from '@/lib/auth'
import type { RefreshTokenPayload } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json()
    if (refreshToken) {
      // decode sem verificar assinatura — só para extrair o jti a revogar.
      // Logout é idempotente: token inválido/expirado não deve gerar erro.
      const decoded = jwt.decode(refreshToken) as RefreshTokenPayload | null
      if (decoded?.jti) await revokeRefreshToken(decoded.jti)
    }
  } catch {
    // idempotente — ignora qualquer falha de parsing
  }
  return NextResponse.json({ ok: true })
}
