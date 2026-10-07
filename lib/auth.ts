import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL_DAYS = 7

// Lazy getters (nunca throw no nível do módulo — quebraria o build do Next.js, AP-008)
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET não configurado')
  return secret
}

function getRefreshSecret(): string {
  return process.env.REFRESH_SECRET || getJwtSecret()
}

export interface AccessTokenPayload {
  sub: string // userId
  role: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_TTL })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AccessTokenPayload
}

/**
 * Cria um refresh token novo: registra a linha em refresh_tokens (jti) e assina o JWT.
 * Revogar é apagar/marcar essa linha — sem depender de Redis.
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  const row = await prisma.refreshToken.create({
    data: { userId, expiresAt },
  })
  return jwt.sign({ sub: userId, jti: row.id }, getRefreshSecret(), {
    expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
  })
}

export interface RefreshTokenPayload {
  sub: string
  jti: string
}

/**
 * Valida assinatura + expiração do JWT E confere que o jti não foi revogado no banco.
 * Lança em qualquer caso inválido — chamador decide o status HTTP.
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const decoded = jwt.verify(token, getRefreshSecret()) as RefreshTokenPayload
  const row = await prisma.refreshToken.findUnique({ where: { id: decoded.jti } })
  if (!row || row.revokedAt || row.expiresAt < new Date()) {
    throw new Error('Refresh token revogado ou expirado')
  }
  return decoded
}

export async function revokeRefreshToken(jti: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { id: jti, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

/**
 * Extrai o userId autenticado do header Authorization: Bearer <token>.
 * Mesmo contrato do antigo getUserFromRequest (lib/supabase-server.ts) —
 * retorna null em qualquer caso inválido, nunca lança.
 */
export async function getUserFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return null

  try {
    const payload = verifyAccessToken(token)
    return payload.sub
  } catch {
    return null
  }
}
