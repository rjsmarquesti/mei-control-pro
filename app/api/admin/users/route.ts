export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const supabase = getServiceClient()

    // Busca todos os usuários do auth (fonte de verdade)
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

    // Busca todos os profiles (inclui campos de trial)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,name,email,phone,city,role,status,subscription_plan,subscription_expires_at,is_trial,updated_at')

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

    // Mescla auth.users com profiles, excluindo admins
    const users = (authData?.users ?? [])
      .filter(u => {
        const p = profileMap.get(u.id)
        return p?.role !== 'admin'
      })
      .map(u => {
        const p = profileMap.get(u.id)
        return {
          id: u.id,
          email: u.email ?? '',
          name: p?.name ?? u.user_metadata?.name ?? '',
          phone: p?.phone ?? u.user_metadata?.phone ?? '',
          city: p?.city ?? u.user_metadata?.city ?? '',
          role: p?.role ?? 'user',
          status: p?.status ?? 'active',
          subscription_plan: p?.subscription_plan ?? 'free',
          subscription_expires_at: p?.subscription_expires_at ?? null,
          is_trial: p?.is_trial ?? false,
          updated_at: p?.updated_at ?? u.created_at,
        }
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    return NextResponse.json(users)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const supabase = getServiceClient()
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    // Deleta do auth (invalida login) e o cascade remove o profile
    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Garante remoção do profile caso não haja cascade
    await supabase.from('profiles').delete().eq('id', id)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const supabase = getServiceClient()
    const body = await req.json()
    const { id, action, ...updates } = body
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    // Ação especial: restaurar trial de 7 dias
    if (action === 'restore_trial') {
      const trialExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { error } = await supabase.from('profiles').update({
        subscription_plan: 'premium',
        subscription_expires_at: trialExpires,
        is_trial: true,
        status: 'active',
        updated_at: new Date().toISOString(),
      }).eq('id', id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, action: 'restore_trial', trial_expires: trialExpires })
    }

    // Atualização genérica
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, subscription_plan, subscription_expires_at')
      .single()

    if (error) {
      console.error('[PATCH /api/admin/users] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: `Nenhum usuário encontrado com id=${id}` }, { status: 404 })
    }

    return NextResponse.json({ ok: true, updated: data })
  } catch (e: any) {
    console.error('[PATCH /api/admin/users] Exception:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
