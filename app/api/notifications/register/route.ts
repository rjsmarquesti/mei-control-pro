export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// Boas-vindas só faz sentido logo após o cadastro; impede reuso da rota para disparar WhatsApp.
const JANELA_BOAS_VINDAS_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Dados vêm do banco, nunca do corpo: o chamador não escolhe nome/e-mail/telefone enviados ao n8n.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true, city: true, createdAt: true },
  })
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  if (Date.now() - user.createdAt.getTime() > JANELA_BOAS_VINDAS_MS) {
    return NextResponse.json({ ok: true, skipped: 'conta_antiga' })
  }

  const N8N_URL = process.env.N8N_WEBHOOK_URL ?? 'https://n8n.divulgabr.com.br/webhook/mei-cadastro'
  const NUTRICAO_URL = process.env.N8N_NUTRICAO_URL ?? 'https://n8n.divulgabr.com.br/webhook/mei-nutricao-trigger'

  const { email, city } = user
  const name = user.name ?? ''
  const phone = user.phone ?? ''

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
