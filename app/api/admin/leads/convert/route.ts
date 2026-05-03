export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const { leadId, name, email, phone, city } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })

    const supabase = getServiceClient()

    // Se já existe usuário, apenas atualiza o lead e retorna sucesso
    const { data: existing } = await supabase.auth.admin.listUsers()
    const existingUser = existing?.users?.find(u => u.email === email)
    if (existingUser) {
      if (leadId) {
        await supabase.from('leads').update({
          status: 'convertido',
          notes: 'Adicionado a clientes',
        }).eq('id', leadId)
      }
      return NextResponse.json({ ok: true, userId: existingUser.id, alreadyExisted: true })
    }

    // Criar usuário com email confirmado (sem senha — link de definição será enviado)
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!'
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, phone, city },
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const userId = authData.user.id

    // Criar perfil
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      name,
      email,
      phone,
      city,
      role: 'user',
      status: 'active',
      subscription_plan: 'free',
      updated_at: new Date().toISOString(),
    })
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

    // Atualizar lead para "convertido"
    if (leadId) {
      await supabase.from('leads').update({
        status: 'convertido',
        notes: 'Convertido em usuário pelo admin',
      }).eq('id', leadId)
    }

    // Enviar email de redefinição de senha para o usuário criar a própria senha
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.sismeipro.com.br'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({ email, gotrue_meta_security: {}, redirect_to: `${appUrl}/nova-senha` }),
    })

    return NextResponse.json({ ok: true, userId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
