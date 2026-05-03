export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const { name, email, password, phone, city, plan = 'free' } = await req.json()
    if (!email || !password) return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })

    const supabase = getServiceClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, city },
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const userId = authData.user.id
    const expires = plan !== 'free' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null

    // Create profile
    await supabase.from('profiles').upsert({
      id: userId,
      name: name || null,
      email,
      phone: phone || null,
      city: city || null,
      role: 'user',
      status: 'active',
      subscription_plan: plan,
      subscription_expires_at: expires,
      updated_at: new Date().toISOString(),
    })

    // Create lead
    await supabase.from('leads').upsert(
      { name, email, phone, city, status: 'novo', notes: 'Criado pelo admin', updated_at: new Date().toISOString() },
      { onConflict: 'email' }
    )

    return NextResponse.json({ ok: true, userId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
