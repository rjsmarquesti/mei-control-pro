import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limiter — suficiente para o volume atual (single instance)
// Estrutura: ip:path → { count, resetAt }
const store = new Map<string, { count: number; resetAt: number }>()

const RULES: { matcher: RegExp; limit: number; windowMs: number }[] = [
  { matcher: /^\/api\/auth\//,        limit: 10,  windowMs: 60_000  }, // 10 req/min em auth
  { matcher: /^\/api\/checkout$/,     limit: 5,   windowMs: 60_000  }, // 5 req/min em checkout
  { matcher: /^\/api\/webhook\//,     limit: 30,  windowMs: 60_000  }, // 30 req/min em webhooks
  { matcher: /^\/api\/profiles\//,    limit: 20,  windowMs: 60_000  }, // 20 req/min em profiles
  { matcher: /^\/api\/consent$/,      limit: 5,   windowMs: 60_000  }, // 5 req/min em consent
  { matcher: /^\/api\/lgpd\//,        limit: 5,   windowMs: 300_000 }, // 5 req/5min em LGPD
  { matcher: /^\/api\/mei-ativar$/,   limit: 5,   windowMs: 300_000 }, // 5 req/5min — anti brute-force
  { matcher: /^\/api\/mei-verificar$/,limit: 10,  windowMs: 60_000  }, // 10 req/min — revalidação
]

// Limpa entradas expiradas a cada 500 req para evitar memory leak
let callCount = 0
function maybeCleanup() {
  if (++callCount % 500 !== 0) return
  const now = Date.now()
  Array.from(store.entries()).forEach(([key, val]) => {
    if (now > val.resetAt) store.delete(key)
  })
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const rule = RULES.find(r => r.matcher.test(path))
  if (!rule) return NextResponse.next()

  maybeCleanup()

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const key = `${ip}:${path}`
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + rule.windowMs })
    return NextResponse.next()
  }

  if (entry.count >= rule.limit) {
    return new NextResponse(
      JSON.stringify({ error: 'Muitas requisições. Tente novamente em instantes.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      }
    )
  }

  entry.count++
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/checkout',
    '/api/webhook/:path*',
    '/api/profiles/:path*',
    '/api/consent',
    '/api/lgpd/:path*',
    '/api/mei-ativar',
    '/api/mei-verificar',
  ],
}
