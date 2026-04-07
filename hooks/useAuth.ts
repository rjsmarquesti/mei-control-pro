'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'

export function useAuth() {
  const router = useRouter()
  const setUser = useAppStore((s) => s.setUser)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }

      const u = session.user

      // Try to load profile from database
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single()

      setUser({
        id: u.id,
        name: profile?.name ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'Usuário',
        email: u.email ?? '',
        company: profile?.company ?? u.user_metadata?.company ?? 'Minha Empresa',
        meiSince: profile?.mei_since ?? u.user_metadata?.meiSince ?? new Date().getFullYear().toString(),
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
