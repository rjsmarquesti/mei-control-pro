export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const TERMS_VERSION   = '2026-06-02'
const PRIVACY_VERSION = '2026-06-02'

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserFromRequest(req)
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? null

    const userAgent = req.headers.get('user-agent') ?? null

    const body = await req.json().catch(() => ({}))
    const terms_version   = body.terms_version   ?? TERMS_VERSION
    const privacy_version = body.privacy_version ?? PRIVACY_VERSION

    await prisma.consent.create({
      data: { userId, termsVersion: terms_version, privacyVersion: privacy_version, ip, userAgent },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
