export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const supabase = getServiceClient()

    const [{ data: authData }, { data: leads }, { data: profiles }] = await Promise.all([
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ])

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

    // Usuários (auth.users excluindo admins)
    const users = (authData?.users ?? [])
      .filter(u => profileMap.get(u.id)?.role !== 'admin')
      .map(u => {
        const p = profileMap.get(u.id)
        return {
          id: u.id,
          type: 'user' as const,
          name: p?.name ?? u.user_metadata?.name ?? '',
          email: u.email ?? '',
          phone: p?.phone ?? u.user_metadata?.phone ?? '',
          city: p?.city ?? u.user_metadata?.city ?? '',
          status: p?.status ?? 'active',
          subscription_plan: p?.subscription_plan ?? 'free',
          created_at: u.created_at,
          updated_at: p?.updated_at ?? u.created_at,
        }
      })

    // Leads (excluindo convertidos que já viram usuários)
    const userEmails = new Set(users.map(u => u.email))
    const leadsFiltered = (leads ?? [])
      .filter(l => l.status !== 'convertido' && !userEmails.has(l.email))
      .map(l => ({
        id: l.id,
        type: 'lead' as const,
        name: l.name,
        email: l.email,
        phone: l.phone,
        city: l.city,
        status: l.status,
        subscription_plan: null,
        notes: l.notes,
        created_at: l.created_at,
        updated_at: l.created_at,
      }))

    const contacts = [...users, ...leadsFiltered]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    return NextResponse.json(contacts)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
