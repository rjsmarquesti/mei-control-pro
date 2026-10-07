import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const ACTIVATION_URL = 'https://activation.sismeipro.com.br/api/admin/apps/eletrica-nbr/gerar-codigo'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const { email } = await req.json()
  if (!email) {
    return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })
  }

  const ADMIN_KEY = process.env.ACTIVATION_ADMIN_KEY
  if (!ADMIN_KEY) {
    return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 503 })
  }

  const emailNorm = String(email).toLowerCase().trim()

  const res = await fetch(ACTIVATION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
    body: JSON.stringify({ email: emailNorm }),
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? 'Erro ao gerar código.' }, { status: res.status })
  }

  return NextResponse.json({ email: emailNorm, code: data.codigo ?? data.code })
}
