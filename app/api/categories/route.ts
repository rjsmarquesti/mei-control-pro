export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const categories = await prisma.category.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { name, type, color } = await req.json()
    if (!name || !type) return NextResponse.json({ error: 'name e type são obrigatórios' }, { status: 400 })

    const category = await prisma.category.create({ data: { userId, name, type, color } })
    return NextResponse.json(category)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
