export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { password } = await req.json()
    if (!password || String(password).length < 8) {
      return NextResponse.json({ error: 'A senha precisa ter no mínimo 8 caracteres' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
