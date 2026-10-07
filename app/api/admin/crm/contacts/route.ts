export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const [users, leads] = await Promise.all([
      prisma.user.findMany({
        where: { role: { not: 'admin' } },
        select: { id: true, name: true, email: true, phone: true, city: true, status: true, subscriptionPlan: true, createdAt: true, updatedAt: true },
      }),
      prisma.lead.findMany({ orderBy: { createdAt: 'desc' } }),
    ])

    const contacts = [
      ...users.map(u => ({
        id: u.id, type: 'user' as const, name: u.name ?? '', email: u.email, phone: u.phone ?? '',
        city: u.city ?? '', status: u.status, subscription_plan: u.subscriptionPlan,
        created_at: u.createdAt, updated_at: u.updatedAt,
      })),
      ...leads
        .filter(l => l.status !== 'convertido' && !users.some(u => u.email === l.email))
        .map(l => ({
          id: l.id, type: 'lead' as const, name: l.name, email: l.email, phone: l.phone,
          city: l.city, status: l.status, subscription_plan: null, notes: l.notes,
          created_at: l.createdAt, updated_at: l.createdAt,
        })),
    ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    return NextResponse.json(contacts)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
