import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const SALT = process.env.MEI_ACTIVATION_SALT
  if (!SALT) return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 503 })

  const { email } = await req.json()
  if (!email) {
    return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })
  }

  const emailNorm = String(email).toLowerCase().trim()
  const code = createHmac('sha256', SALT).update(emailNorm).digest('hex').slice(0, 8).toUpperCase()

  return NextResponse.json({ email: emailNorm, code })
}
