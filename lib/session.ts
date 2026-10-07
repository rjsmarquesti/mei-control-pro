'use client'

const ACCESS_KEY = 'mei_access_token'
const REFRESH_KEY = 'mei_refresh_token'

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

/** Extrai o payload (não-verificado) do access token — uso client-side apenas para exibição, nunca para autorização real. */
export function decodeAccessToken(): { sub: string; role: string } | null {
  const token = getAccessToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return { sub: payload.sub, role: payload.role }
  } catch {
    return null
  }
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) {
    clearTokens()
    return null
  }
  const data = await res.json()
  setTokens(data.accessToken, data.refreshToken)
  return data.accessToken as string
}

/**
 * fetch com Authorization: Bearer automático. Em 401, tenta refresh uma vez e repete a chamada.
 * Se o refresh falhar, limpa a sessão e redireciona pro login.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let token = getAccessToken()

  const withAuth = (t: string | null): RequestInit => ({
    ...init,
    headers: { ...init.headers, ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  })

  let res = await fetch(input, withAuth(token))

  if (res.status === 401) {
    token = await tryRefresh()
    if (!token) {
      if (typeof window !== 'undefined') window.location.href = '/login'
      return res
    }
    res = await fetch(input, withAuth(token))
  }

  return res
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  clearTokens()
  if (refreshToken) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }
}
