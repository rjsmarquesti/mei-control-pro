'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch, getAccessToken, logout as sessionLogout } from '@/lib/session'
import { useAppStore } from '@/store/useAppStore'

export function useAuth() {
  const router = useRouter()
  const setUser = useAppStore((s) => s.setUser)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    authFetch('/api/profile').then(async (res) => {
      if (!res.ok) {
        router.push('/login')
        return
      }
      const profile = await res.json()
      setUser({
        id: profile.id ?? '',
        name: profile.name ?? profile.email?.split('@')[0] ?? 'Usuário',
        email: profile.email ?? '',
        company: profile.company ?? 'Minha Empresa',
        meiSince: profile.mei_since ?? new Date().getFullYear().toString(),
      })
    }).catch(() => router.push('/login'))
  }, [router, setUser])
}

export async function signOut() {
  await sessionLogout()
}
