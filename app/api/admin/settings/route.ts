export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const data = await prisma.systemSetting.findMany({ orderBy: { key: 'asc' } })
    return NextResponse.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const { key, value } = await req.json()
    if (!key || value === undefined) return NextResponse.json({ error: 'key e value são obrigatórios' }, { status: 400 })

    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value, updatedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
