export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logSecurityEvent } from '@/lib/audit'

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserFromRequest(req)
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const [profile, transactions, dasPayments, consents] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true, city: true, cnpj: true, role: true, status: true, subscriptionPlan: true, subscriptionExpiresAt: true, createdAt: true },
      }),
      prisma.transaction.findMany({
        where: { userId },
        select: { id: true, date: true, type: true, description: true, category: true, value: true, status: true, createdAt: true },
        orderBy: { date: 'desc' },
      }),
      prisma.dasPayment.findMany({
        where: { userId },
        select: { id: true, competencia: true, value: true, dueDate: true, paidAt: true, status: true },
        orderBy: { dueDate: 'desc' },
      }),
      prisma.consent.findMany({
        where: { userId },
        select: { termsVersion: true, privacyVersion: true, acceptedAt: true },
        orderBy: { acceptedAt: 'desc' },
      }),
    ])

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

    await logSecurityEvent({
      userId,
      action: 'lgpd_export',
      entity_type: 'user_data',
      entity_id: userId,
      ip,
      user_agent: req.headers.get('user-agent') ?? null,
    })

    // Registra solicitação de exportação
    await prisma.lgpdRequest.create({
      data: { userId, type: 'export', status: 'completed', completedAt: new Date() },
    })

    const exportData = {
      export_date: new Date().toISOString(),
      profile,
      transactions,
      das_payments: dasPayments,
      consents,
    }

    return new NextResponse(JSON.stringify(exportData, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="meicontrolpro-dados-${userId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
