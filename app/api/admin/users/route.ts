export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      select: {
        id: true, email: true, name: true, phone: true, city: true, role: true, status: true,
        subscriptionPlan: true, subscriptionExpiresAt: true, isTrial: true, updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(users.map(u => ({
      id: u.id, email: u.email, name: u.name ?? '', phone: u.phone ?? '', city: u.city ?? '',
      role: u.role, status: u.status, subscription_plan: u.subscriptionPlan,
      subscription_expires_at: u.subscriptionExpiresAt, is_trial: u.isTrial, updated_at: u.updatedAt,
    })))
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const { id, action, ...updates } = body
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    if (action === 'restore_trial') {
      const trialExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const updated = await prisma.user.update({
        where: { id },
        data: { subscriptionPlan: 'premium', subscriptionExpiresAt: trialExpires, isTrial: true, status: 'active' },
      }).catch(() => null)

      if (!updated) return NextResponse.json({ error: `Nenhum usuário encontrado com id=${id}` }, { status: 404 })
      return NextResponse.json({ ok: true, action: 'restore_trial', trial_expires: trialExpires.toISOString() })
    }

    // Atualização genérica — mapeia nomes de campo do frontend (snake_case) para o schema
    const data: Record<string, unknown> = {}
    if ('name' in updates) data.name = updates.name
    if ('phone' in updates) data.phone = updates.phone
    if ('city' in updates) data.city = updates.city
    if ('status' in updates) data.status = updates.status
    if ('subscription_plan' in updates) data.subscriptionPlan = updates.subscription_plan
    if ('subscription_expires_at' in updates) data.subscriptionExpiresAt = updates.subscription_expires_at ? new Date(updates.subscription_expires_at) : null
    if ('is_trial' in updates) data.isTrial = updates.is_trial

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, subscriptionPlan: true, subscriptionExpiresAt: true },
    }).catch((err: unknown) => {
      console.error('[PATCH /api/admin/users] Prisma error:', err)
      return null
    })

    if (!updated) {
      return NextResponse.json({ error: `Nenhum usuário encontrado com id=${id}` }, { status: 404 })
    }

    return NextResponse.json({ ok: true, updated: { id: updated.id, subscription_plan: updated.subscriptionPlan, subscription_expires_at: updated.subscriptionExpiresAt } })
  } catch (e) {
    console.error('[PATCH /api/admin/users] Exception:', e)
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
