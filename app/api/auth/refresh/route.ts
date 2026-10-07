export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, revokeRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json()
    if (!refreshToken) {
      return NextResponse.json({ error: 'refreshToken obrigatório' }, { status: 400 })
    }

    const decoded = await verifyRefreshToken(refreshToken)
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } })
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 })
    }

    // Rotaciona o refresh token — revoga o antigo, emite um novo
    await revokeRefreshToken(decoded.jti)
    const accessToken = generateAccessToken({ sub: user.id, role: user.role })
    const newRefreshToken = await generateRefreshToken(user.id)

    return NextResponse.json({ accessToken, refreshToken: newRefreshToken })
  } catch {
    return NextResponse.json({ error: 'Refresh token inválido ou expirado' }, { status: 401 })
  }
}
