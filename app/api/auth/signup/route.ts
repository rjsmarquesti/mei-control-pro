export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateAccessToken, generateRefreshToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, phone, city } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'A senha precisa ter no mínimo 8 caracteres' }, { status: 400 })
    }

    const emailNorm = String(email).toLowerCase().trim()

    const existing = await prisma.user.findUnique({ where: { email: emailNorm } })
    if (existing) {
      return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email: emailNorm,
        passwordHash,
        name: name || null,
        phone: phone || null,
        city: city || null,
        role: 'user',
        status: 'active',
        subscriptionPlan: 'free',
        isTrial: false,
        emailConfirmedAt: new Date(), // auto-confirmado — sem etapa de verificação de e-mail
      },
    })

    const accessToken = generateAccessToken({ sub: user.id, role: user.role })
    const refreshToken = await generateRefreshToken(user.id)

    return NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
      accessToken,
      refreshToken,
    })
  } catch (err) {
    console.error('[auth/signup]', err)
    return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 })
  }
}
