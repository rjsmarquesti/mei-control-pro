import crypto from 'crypto'

const SECRET = process.env.MEI_TOKEN_SECRET || 'dev-secret-change-in-prod'
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias

export function signMeiToken(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifyMeiToken(token: string): { email: string; exp: number } | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null
    const payload = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null
    if (typeof data.email !== 'string') return null
    return data
  } catch {
    return null
  }
}
