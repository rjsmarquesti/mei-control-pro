export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'

// GET — lista todos os admins
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const supabase = getServiceClient()
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, email, status, updated_at')
    .eq('role', 'admin')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enriquece com email do auth.users (profiles pode não ter)
  const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = Object.fromEntries((authList?.users ?? []).map(u => [u.id, u.email]))

  const admins = (profiles ?? []).map(p => ({
    ...p,
    email: p.email || emailMap[p.id] || '',
  }))

  return NextResponse.json(admins)
}

// POST — cria novo admin
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const { name, email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Verifica se email já existe
    const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const existing = authList?.users.find(u => u.email === email)
    if (existing) {
      // Se já existe, apenas promove a admin
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', existing.id).single()
      if (profile?.role === 'admin') {
        return NextResponse.json({ error: 'Este email já é admin' }, { status: 400 })
      }
      await supabase.from('profiles').update({ role: 'admin', updated_at: new Date().toISOString() }).eq('id', existing.id)
      return NextResponse.json({ ok: true, userId: existing.id, promoted: true })
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const userId = authData.user.id
    await supabase.from('profiles').upsert({
      id: userId,
      name: name || null,
      email,
      role: 'admin',
      status: 'active',
      subscription_plan: 'premium',
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, userId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — altera senha ou nome de um admin
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const { id, name, password } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    const supabase = getServiceClient()

    // Garante que o alvo é admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Usuário não é admin' }, { status: 403 })
    }

    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 })
      }
      const { error } = await supabase.auth.admin.updateUserById(id, { password })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (name !== undefined) {
      await supabase.from('profiles').update({ name: name || null, updated_at: new Date().toISOString() }).eq('id', id)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — remove role admin (rebaixa para user) ou deleta conta
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const { id, deleteAccount } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    // Não pode remover a si mesmo
    if (id === auth.adminId) {
      return NextResponse.json({ error: 'Não é possível remover sua própria conta admin' }, { status: 400 })
    }

    const supabase = getServiceClient()

    if (deleteAccount) {
      await supabase.auth.admin.deleteUser(id)
    } else {
      // Apenas rebaixa para user
      await supabase.from('profiles').update({ role: 'user', updated_at: new Date().toISOString() }).eq('id', id)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
