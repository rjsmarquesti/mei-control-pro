export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, city, status = 'novo', notes = '' } = await req.json()

    if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })

    await prisma.lead.upsert({
      where: { email },
      create: { name, email, phone, city, status, notes },
      update: { name, phone, city, status, notes, updatedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
