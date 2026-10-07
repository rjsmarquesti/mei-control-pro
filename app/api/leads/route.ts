export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Única nota que um chamador anônimo pode gravar; qualquer outro texto é descartado.
const NOTA_CADASTRO = 'Cadastro gratuito via app'

const texto = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' ? v.trim().slice(0, max) : undefined

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = texto(body?.email, 320)

    if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'email inválido' }, { status: 400 })
    }

    const name = texto(body?.name, 120)
    const phone = texto(body?.phone, 30)
    const city = texto(body?.city, 80)
    const notes = body?.notes === NOTA_CADASTRO ? NOTA_CADASTRO : ''

    // Rota pública: status e notes só são definidos na criação. Em lead existente
    // (que pode já ter sido trabalhado por um admin) ficam intactos.
    await prisma.lead.upsert({
      where: { email },
      create: { name, email, phone, city, status: 'novo', notes },
      update: { name, phone, city, updatedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
