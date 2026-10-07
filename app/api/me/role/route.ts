import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserFromRequest(req)
    if (!userId) return NextResponse.json({ role: 'user' })

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })

    // Registra último acesso para detecção de inatividade (lifecycle P3)
    prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } })
      .catch(() => {/* fire and forget */})

    return NextResponse.json({ role: user?.role ?? 'user' })
  } catch {
    return NextResponse.json({ role: 'user' })
  }
}
