export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const contactId = req.nextUrl.searchParams.get('contact_id')
  if (!contactId) return NextResponse.json({ error: 'contact_id obrigatório' }, { status: 400 })

  const notes = await prisma.crmNote.findMany({
    where: { contactId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(notes.map(n => ({ ...n, id: n.id.toString() })), { status: 200 })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const { contact_id, contact_type, content, interaction_type } = await req.json()
  if (!contact_id || !content) return NextResponse.json({ error: 'contact_id e content obrigatórios' }, { status: 400 })

  try {
    const note = await prisma.crmNote.create({
      data: { contactId: contact_id, contactType: contact_type ?? 'lead', content, interactionType: interaction_type ?? 'note' },
    })
    return NextResponse.json({ ...note, id: note.id.toString() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    await prisma.crmNote.delete({ where: { id: BigInt(id) } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
