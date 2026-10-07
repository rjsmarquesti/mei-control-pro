export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { hashPassword } from '@/lib/auth'

// GET — lista todos os admins
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { id: true, name: true, email: true, status: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(admins.map(a => ({ ...a, updated_at: a.updatedAt })))
}

// POST — cria novo admin
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const { name, email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      if (existing.role === 'admin') {
        return NextResponse.json({ error: 'Este email já é admin' }, { status: 400 })
      }
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } })
      return NextResponse.json({ ok: true, userId: existing.id, promoted: true })
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email, name: name || null, passwordHash, role: 'admin', status: 'active',
        subscriptionPlan: 'premium', emailConfirmedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true, userId: user.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH — altera senha ou nome de um admin
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const { id, name, password } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (target?.role !== 'admin') {
      return NextResponse.json({ error: 'Usuário não é admin' }, { status: 403 })
    }

    const data: Record<string, unknown> = {}
    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 })
      }
      data.passwordHash = await hashPassword(password)
    }
    if (name !== undefined) data.name = name || null

    await prisma.user.update({ where: { id }, data })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE — remove role admin (rebaixa para user) ou deleta conta
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const { id, deleteAccount } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    if (id === auth.adminId) {
      return NextResponse.json({ error: 'Não é possível remover sua própria conta admin' }, { status: 400 })
    }

    if (deleteAccount) {
      await prisma.user.delete({ where: { id } })
    } else {
      await prisma.user.update({ where: { id }, data: { role: 'user' } })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
