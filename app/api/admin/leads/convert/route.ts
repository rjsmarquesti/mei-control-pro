export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { hashPassword } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/mailer'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1h

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const { leadId, name, email, phone, city } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      if (leadId) {
        await prisma.lead.update({ where: { id: leadId }, data: { status: 'convertido', notes: 'Adicionado a clientes' } })
      }
      return NextResponse.json({ ok: true, userId: existingUser.id, alreadyExisted: true })
    }

    // Cria usuário com senha temporária aleatória — link de definição será enviado por email
    const tempPassword = randomBytes(16).toString('hex')
    const passwordHash = await hashPassword(tempPassword)

    const user = await prisma.user.create({
      data: {
        email, name, phone, city, passwordHash,
        role: 'user', status: 'active', subscriptionPlan: 'free',
        emailConfirmedAt: new Date(),
      },
    })

    if (leadId) {
      await prisma.lead.update({ where: { id: leadId }, data: { status: 'convertido', notes: 'Convertido em usuário pelo admin' } })
    }

    // Envia email de definição de senha (mesmo fluxo de "esqueci minha senha")
    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.sismeipro.com.br'
    sendPasswordResetEmail(email, `${appUrl}/nova-senha?token=${rawToken}`).catch(err =>
      console.error('[admin/leads/convert] falha ao enviar email:', err)
    )

    return NextResponse.json({ ok: true, userId: user.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
