export const dynamic = 'force-dynamic'

/**
 * GET /api/whatsapp/user-context?phone=5521XXXXXXXX
 * Chamado pelo n8n (bot WhatsApp IA) para identificar quem está enviando mensagem.
 * Busca por telefone normalizado em profiles e leads.
 * Retorna contexto para personalizar resposta da IA.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

// Normaliza phone para comparação: remove DDI 55 e não-dígitos
function normalizePhone(phone: string): string[] {
  const digits = (phone || '').replace(/\D/g, '')
  const candidates: string[] = []
  // com DDI: 5521999999999 → 21999999999
  if (digits.length === 13 && digits.startsWith('55')) {
    const sem55 = digits.slice(2) // 11 dígitos
    candidates.push(sem55)
    candidates.push(`(${sem55.slice(0, 2)}) ${sem55.slice(2, 7)}-${sem55.slice(7)}`)
    candidates.push(`(${sem55.slice(0, 2)}) ${sem55.slice(2, 6)}-${sem55.slice(6)}`)
  }
  candidates.push(digits)
  return candidates
}

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone') ?? ''
  if (!phone) return NextResponse.json({ perfil_tipo: 'desconhecido', nome: 'Visitante' })

  try {
    const supabase = getServiceClient()
    const candidates = normalizePhone(phone)

    // Busca em profiles (qualquer formato de phone que coincida)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, subscription_plan, subscription_expires_at, status')
      .or(candidates.map(c => `phone.eq.${c}`).join(','))
      .limit(1)

    if (profiles && profiles.length > 0) {
      const p = profiles[0]
      const now = new Date()
      const expires = p.subscription_expires_at ? new Date(p.subscription_expires_at) : null
      const expired = expires ? expires < now : false
      const plan = expired ? 'free' : (p.subscription_plan ?? 'free')

      let perfil_tipo: string
      if (plan === 'premium') perfil_tipo = 'cliente_premium'
      else if (plan === 'pro') perfil_tipo = 'cliente_pro'
      else if (plan === 'basic') perfil_tipo = 'cliente_basic'
      else perfil_tipo = 'cliente_free'

      return NextResponse.json({
        perfil_tipo,
        user_id: p.id,
        nome: p.name ?? 'MEI',
        plano: plan,
        expiracao: expires ? expires.toLocaleDateString('pt-BR') : null,
        plano_expirado: expired,
      })
    }

    // Busca em leads
    const { data: leads } = await supabase
      .from('leads')
      .select('id, name, status')
      .or(candidates.map(c => `phone.eq.${c}`).join(','))
      .limit(1)

    if (leads && leads.length > 0) {
      return NextResponse.json({
        perfil_tipo: 'lead',
        nome: leads[0].name ?? 'Visitante',
        plano: null,
        expiracao: null,
        plano_expirado: false,
      })
    }

    return NextResponse.json({
      perfil_tipo: 'desconhecido',
      nome: 'Visitante',
      plano: null,
      expiracao: null,
      plano_expirado: false,
    })
  } catch {
    return NextResponse.json({ perfil_tipo: 'desconhecido', nome: 'Visitante' })
  }
}
