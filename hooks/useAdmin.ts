'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch, getAccessToken } from '@/lib/session'

export function useAdmin() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const accessToken = getAccessToken()
    if (!accessToken) {
      router.push('/login')
      setLoading(false)
      return
    }

    authFetch('/api/me/role', { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { role } = await res.json()

        if (role !== 'admin') {
          router.push('/dashboard')
          setLoading(false)
          return
        }

        setToken(getAccessToken())
        setIsAdmin(true)
      })
      .catch((e) => {
        console.error('[useAdmin]', e)
      })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { isAdmin, loading, token }
}
