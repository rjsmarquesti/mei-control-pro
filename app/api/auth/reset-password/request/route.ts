export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/mailer'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1h

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })

    const emailNorm = String(email).toLowerCase().trim()
    const user = await prisma.user.findUnique({ where: { email: emailNorm } })

    // Sempre responde ok — não revela se o email existe (evita user enumeration)
    if (user) {
      const rawToken = randomBytes(32).toString('hex')
      const tokenHash = createHash('sha256').update(rawToken).digest('hex')

      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
      })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.sismeipro.com.br'
      const resetUrl = `${appUrl}/nova-senha?token=${rawToken}`

      sendPasswordResetEmail(user.email, resetUrl).catch(err =>
        console.error('[auth/reset-password/request] falha ao enviar email:', err)
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[auth/reset-password/request]', err)
    return NextResponse.json({ ok: true }) // nunca vaza detalhe de erro nesse endpoint
  }
}
