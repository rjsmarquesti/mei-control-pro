import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()

  const N8N_URL = process.env.N8N_WEBHOOK_URL ?? 'https://n8n.divulgabr.com.br/webhook/mei-cadastro'
  const NUTRICAO_URL = process.env.N8N_NUTRICAO_URL ?? 'https://n8n.divulgabr.com.br/webhook/mei-nutricao-trigger'

  const { name, email, phone, city } = body

  const msg = `🎉 Bem-vindo(a) ao MEI Control Pro!\n\nOlá, *${name}*! Seu cadastro foi realizado com sucesso.\n\n📧 *E-mail cadastrado:* ${email}\n📱 *Telefone:* ${phone}\n\nSua conta já está ativa — acesse agora para gerenciar suas finanças como MEI.\n\nQualquer dúvida, estamos à disposição! 😊\n\n🔗 https://app.sismeipro.com.br`

  await Promise.allSettled([
    fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, city, instance: 'sismei', numero: '5521980485675', mensagem: msg }),
    }),
    fetch(NUTRICAO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, city }),
    }),
  ])

  return NextResponse.json({ ok: true })
}
