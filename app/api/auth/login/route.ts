export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateAccessToken, generateRefreshToken } from '@/lib/auth'

// Hash dummy — usado quando o email não existe, para o tempo de resposta não
// revelar se o email está cadastrado (evita user enumeration por timing).
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    const emailNorm = String(email).toLowerCase().trim()
    const user = await prisma.user.findUnique({ where: { email: emailNorm } })

    const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)
    if (!user || !ok) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    const accessToken = generateAccessToken({ sub: user.id, role: user.role })
    const refreshToken = await generateRefreshToken(user.id)

    return NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
      accessToken,
      refreshToken,
    })
  } catch (err) {
    console.error('[auth/login]', err)
    return NextResponse.json({ error: 'Erro ao autenticar' }, { status: 500 })
  }
}
