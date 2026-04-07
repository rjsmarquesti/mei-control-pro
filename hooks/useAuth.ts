'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'

export function useAuth() {
  const router = useRouter()
  const setUser = useAppStore((s) => s.setUser)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }
      const u = session.user
      setUser({
        id: u.id,
        name: u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'Usuário',
        email: u.email ?? '',
        company: u.user_metadata?.company ?? 'Minha Empresa',
        meiSince: u.user_metadata?.meiSince ?? new Date().getFullYear().toString(),
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, setUser])
}

export async function signOut() {
  await supabase.auth.signOut()
}
