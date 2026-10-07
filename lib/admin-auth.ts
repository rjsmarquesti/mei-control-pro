import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logSecurityEvent } from '@/lib/audit'

// Ativar após habilitar TOTP no fluxo de login próprio (ainda não implementado).
const MFA_REQUIRED = process.env.ADMIN_MFA_REQUIRED === 'true'

export async function requireAdmin(req: NextRequest): Promise<{ error: NextResponse } | { adminId: string }> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const token = authHeader.replace('Bearer ', '')

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const ua = req.headers.get('user-agent') ?? null

  try {
    const payload = verifyAccessToken(token)

    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { role: true } })
    if (user?.role !== 'admin') {
      await logSecurityEvent({ userId: payload.sub, action: 'admin_access_denied_role', ip, user_agent: ua })
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }

    if (MFA_REQUIRED) {
      // TOTP ainda não implementado na auth própria — placeholder mantido do design original.
      await logSecurityEvent({ userId: payload.sub, action: 'admin_access_denied_mfa', ip, user_agent: ua })
      return { error: NextResponse.json({ error: 'MFA obrigatório para acesso administrativo.' }, { status: 403 }) }
    }

    return { adminId: payload.sub }
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
}
