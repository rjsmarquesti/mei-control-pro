export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, phone: true, city: true, company: true, cnpj: true,
      activity: true, meiSince: true, dasMultaPct: true, dasJurosPct: true,
    },
  })
  if (!user) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  return NextResponse.json({
    id: user.id, name: user.name, email: user.email, phone: user.phone, city: user.city, company: user.company,
    cnpj: user.cnpj, activity: user.activity, mei_since: user.meiSince,
    das_multa_pct: user.dasMultaPct, das_juros_pct: user.dasJurosPct,
  })
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if ('name' in body) data.name = body.name || null
    if ('phone' in body) data.phone = body.phone || null
    if ('city' in body) data.city = body.city || null
    if ('company' in body) data.company = body.company || null
    if ('cnpj' in body) data.cnpj = body.cnpj || null
    if ('activity' in body) data.activity = body.activity || null
    if ('mei_since' in body) data.meiSince = body.mei_since || null
    if ('das_multa_pct' in body) data.dasMultaPct = body.das_multa_pct
    if ('das_juros_pct' in body) data.dasJurosPct = body.das_juros_pct

    await prisma.user.update({ where: { id: userId }, data })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
