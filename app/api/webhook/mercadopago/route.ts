import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'

const MP_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN ?? ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Mercado Pago sends a notification with type and data.id
    if (body.type !== 'payment') {
      return NextResponse.json({ ok: true })
    }

    if (!MP_TOKEN || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Não configurado' }, { status: 500 })
    }

    const mp = new MercadoPagoConfig({ accessToken: MP_TOKEN })
    const paymentClient = new Payment(mp)
    const payment = await paymentClient.get({ id: body.data.id })

    if (payment.status !== 'approved') {
      return NextResponse.json({ ok: true })
    }

    // external_reference = "userId|plan"
    const [userId, plan] = (payment.external_reference ?? '').split('|')
    if (!userId || !plan) {
      return NextResponse.json({ error: 'Referência inválida' }, { status: 400 })
    }

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const expires = new Date()
    expires.setDate(expires.getDate() + 30)

    await supabase.from('profiles').update({
      subscription_plan: plan,
      subscription_expires_at: expires.toISOString(),
    }).eq('id', userId)

    console.log(`[webhook] Plano ${plan} ativado para ${userId}`)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[webhook/mercadopago]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Mercado Pago also sends GET to validate the webhook URL
export async function GET() {
  return NextResponse.json({ ok: true })
}
