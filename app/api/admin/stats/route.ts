export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const now = new Date()

  const [totalUsers, activeUsers, blockedUsers, paidUsers, totalLeads, newLeads] = await Promise.all([
    prisma.user.count({ where: { role: { not: 'admin' } } }),
    prisma.user.count({ where: { role: { not: 'admin' }, status: 'active' } }),
    prisma.user.count({ where: { role: { not: 'admin' }, status: { in: ['blocked', 'suspended'] } } }),
    prisma.user.count({ where: { role: { not: 'admin' }, subscriptionPlan: { not: 'free' }, subscriptionExpiresAt: { gt: now } } }),
    prisma.lead.count({ where: { status: { in: ['novo', 'contatado', 'perdido'] } } }),
    prisma.lead.count({ where: { status: 'novo' } }),
  ])

  return NextResponse.json({ totalUsers, activeUsers, blockedUsers, totalLeads, newLeads, paidUsers })
}
