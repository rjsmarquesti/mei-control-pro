export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const authenticatedId = await getUserFromRequest(req)
    if (!authenticatedId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id, name, email, phone, city } = await req.json()

    if (!id || !email) return NextResponse.json({ error: 'id e email obrigatórios' }, { status: 400 })

    if (id !== authenticatedId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    await prisma.user.update({
      where: { id },
      data: { name: name || null, phone: phone || null, city: city || null },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
