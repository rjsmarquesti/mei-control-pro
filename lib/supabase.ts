'use client'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

const getSupabaseUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/proxy`
  }
  return supabaseUrl
}

export const supabase = createClient(getSupabaseUrl(), supabaseAnonKey, {
  db: { schema: 'sismei' },
})
