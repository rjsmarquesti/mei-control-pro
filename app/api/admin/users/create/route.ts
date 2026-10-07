export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const { name, email, password, phone, city, plan = 'free' } = await req.json()
    if (!email || !password) return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })

    const passwordHash = await hashPassword(password)
    const expires = plan !== 'free' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null

    const user = await prisma.user.create({
      data: {
        email, name: name || null, phone: phone || null, city: city || null, passwordHash,
        role: 'user', status: 'active', subscriptionPlan: plan, subscriptionExpiresAt: expires,
        emailConfirmedAt: new Date(),
      },
    })

    await prisma.lead.upsert({
      where: { email },
      create: { name, email, phone, city, status: 'novo', notes: 'Criado pelo admin' },
      update: { name, phone, city, status: 'novo', notes: 'Criado pelo admin', updatedAt: new Date() },
    })

    return NextResponse.json({ ok: true, userId: user.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
