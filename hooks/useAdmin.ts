'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function useAdmin() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!session) {
          router.push('/login')
          setLoading(false)
          return
        }

        try {
          const res = await fetch('/api/me/role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({}),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const { role } = await res.json()

          if (role !== 'admin') {
            router.push('/dashboard')
            setLoading(false)
            return
          }

          setToken(session.access_token)
          setIsAdmin(true)
        } catch (e) {
          console.error('[useAdmin]', e)
        } finally {
          setLoading(false)
        }
      })
      .catch((e) => {
        console.error('[useAdmin] getSession error:', e)
        setLoading(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { isAdmin, loading, token }
}
