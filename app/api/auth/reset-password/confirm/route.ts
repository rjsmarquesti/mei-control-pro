export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) {
      return NextResponse.json({ error: 'token e senha são obrigatórios' }, { status: 400 })
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'A senha precisa ter no mínimo 8 caracteres' }, { status: 400 })
    }

    const tokenHash = createHash('sha256').update(String(token)).digest('hex')
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    })
    if (!resetToken) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      // Invalida todas as sessões ativas — força novo login em todos os dispositivos
      prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[auth/reset-password/confirm]', err)
    return NextResponse.json({ error: 'Erro ao redefinir senha' }, { status: 500 })
  }
}
