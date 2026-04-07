import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'

const MP_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN ?? ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.sismei.com.br'

const PLAN_PRICES: Record<string, { title: string; price: number; months: number }> = {
  basic:   { title: 'MEI Control Pro — Plano Basic',   price: 19.90, months: 1 },
  pro:     { title: 'MEI Control Pro — Plano Pro',     price: 39.90, months: 1 },
  premium: { title: 'MEI Control Pro — Plano Premium', price: 59.90, months: 1 },
}

export async function POST(req: NextRequest) {
  try {
    const { plan, userId, userEmail } = await req.json()

    if (!MP_TOKEN) {
      return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 })
    }

    const planConfig = PLAN_PRICES[plan]
    if (!planConfig) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }

    const mp = new MercadoPagoConfig({ accessToken: MP_TOKEN })
    const preference = new Preference(mp)

    const result = await preference.create({
      body: {
        items: [{
          id: plan,
          title: planConfig.title,
          quantity: 1,
          unit_price: planConfig.price,
          currency_id: 'BRL',
        }],
        payer: { email: userEmail },
        external_reference: `${userId}|${plan}`,
        back_urls: {
          success: `${APP_URL}/dashboard/assinatura?status=success&plan=${plan}`,
          failure: `${APP_URL}/dashboard/assinatura?status=failure`,
          pending: `${APP_URL}/dashboard/assinatura?status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${APP_URL}/api/webhook/mercadopago`,
        statement_descriptor: 'MEI CONTROL PRO',
      },
    })

    return NextResponse.json({ url: result.init_point })
  } catch (err: any) {
    console.error('[checkout]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
