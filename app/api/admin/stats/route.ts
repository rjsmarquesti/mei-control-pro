export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const supabase = getServiceClient()

  // Conta usuários via auth (fonte de verdade)
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const { data: profiles } = await supabase.from('profiles').select('id,role,status,subscription_plan,subscription_expires_at')

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))
  const allUsers = (authData?.users ?? []).filter(u => profileMap.get(u.id)?.role !== 'admin')

  const totalUsers = allUsers.length
  const activeUsers = allUsers.filter(u => (profileMap.get(u.id)?.status ?? 'active') === 'active').length
  const blockedUsers = allUsers.filter(u => ['blocked', 'suspended'].includes(profileMap.get(u.id)?.status ?? '')).length
  const now = new Date().toISOString()
  const paidUsers = allUsers.filter(u => {
    const p = profileMap.get(u.id)
    return p && p.subscription_plan !== 'free' && p.subscription_expires_at && p.subscription_expires_at > now
  }).length

  const [{ count: totalLeads }, { count: newLeads }] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).in('status', ['novo', 'contatado', 'perdido']),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'novo'),
  ])

  return NextResponse.json({
    totalUsers,
    activeUsers,
    blockedUsers,
    totalLeads: totalLeads ?? 0,
    newLeads: newLeads ?? 0,
    paidUsers,
  })
}
