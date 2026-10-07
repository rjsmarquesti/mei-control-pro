import { test, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'

process.env.JWT_SECRET = 'segredo-somente-para-testes'

type Row = Record<string, any>
const leads = new Map<string, Row>()
const users = new Map<string, Row>()
let fetchCalls: { url: string; body: any }[] = []

// Fake em memória com a semântica do Prisma que importa aqui: `undefined` em `data` é ignorado.
function applyDefined(target: Row, data: Row): Row {
  for (const [k, v] of Object.entries(data)) if (v !== undefined) target[k] = v
  return target
}

const fakePrisma = {
  lead: {
    findUnique: async ({ where }: any) => leads.get(where.email) ?? null,
    create: async ({ data }: any) => {
      const row = { status: 'novo', notes: null, ...data }
      leads.set(data.email, row)
      return row
    },
    update: async ({ where, data }: any) => applyDefined(leads.get(where.email)!, data),
    upsert: async ({ where, create, update }: any) => {
      const existing = leads.get(where.email)
      if (existing) return applyDefined(existing, update)
      const row = { status: 'novo', notes: null, ...create }
      leads.set(where.email, row)
      return row
    },
  },
  user: {
    findUnique: async ({ where }: any) => users.get(where.id) ?? null,
  },
}

let leadsPOST: (req: NextRequest) => Promise<Response>
let registerPOST: (req: NextRequest) => Promise<Response>
let loginNotifyPOST: (req: NextRequest) => Promise<Response>
let tokenFor: (userId: string) => string

before(async () => {
  ;(globalThis as any).prisma = fakePrisma
  ;(globalThis as any).fetch = async (url: string, init?: RequestInit) => {
    fetchCalls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null })
    return new Response('{}', { status: 200 })
  }
  leadsPOST = (await import('../app/api/leads/route')).POST
  registerPOST = (await import('../app/api/notifications/register/route')).POST
  loginNotifyPOST = (await import('../app/api/auth/login-notify/route')).POST
  const auth = await import('../lib/auth')
  tokenFor = (userId: string) => auth.generateAccessToken({ sub: userId, role: 'user' })
})

beforeEach(() => {
  leads.clear()
  users.clear()
  fetchCalls = []
})

function post(path: string, body: unknown, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
}

const MARCADOR = 'Cadastro gratuito via app'

// ───────────────────────── POST /api/leads (público) ─────────────────────────

test('leads: criação mantém contrato {ok:true} e grava status "novo"', async () => {
  const res = await leadsPOST(post('/api/leads', { name: 'Ana', email: 'ana@x.com', phone: '21999990000', city: 'Rio', status: 'novo' }))
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
  assert.equal(leads.get('ana@x.com')!.status, 'novo')
})

test('leads: cliente anônimo não consegue criar lead já como "convertido"', async () => {
  await leadsPOST(post('/api/leads', { name: 'Eve', email: 'eve@x.com', status: 'convertido' }))
  assert.equal(leads.get('eve@x.com')!.status, 'novo')
})

test('leads: notes arbitrário é descartado na criação; só o marcador do cadastro é aceito', async () => {
  await leadsPOST(post('/api/leads', { email: 'a@x.com', notes: 'texto injetado pelo cliente' }))
  assert.notEqual(leads.get('a@x.com')!.notes, 'texto injetado pelo cliente')

  await leadsPOST(post('/api/leads', { email: 'b@x.com', notes: MARCADOR }))
  assert.equal(leads.get('b@x.com')!.notes, MARCADOR)
})

test('leads: lead existente NÃO tem status nem notes sobrescritos por chamada anônima', async () => {
  leads.set('v@x.com', { email: 'v@x.com', name: 'Vítima', status: 'contatado', notes: 'nota do admin' })
  const res = await leadsPOST(post('/api/leads', { email: 'v@x.com', status: 'perdido', notes: 'lixo' }))
  assert.equal(res.status, 200)
  assert.equal(leads.get('v@x.com')!.status, 'contatado')
  assert.equal(leads.get('v@x.com')!.notes, 'nota do admin')
})

test('leads: cadastro de quem já é lead não faz o status voltar para "novo" nem apaga a nota do admin', async () => {
  leads.set('c@x.com', { email: 'c@x.com', status: 'contatado', notes: 'ligar terça' })
  await leadsPOST(post('/api/leads', { email: 'c@x.com', status: 'novo', notes: MARCADOR }))
  assert.equal(leads.get('c@x.com')!.status, 'contatado')
  assert.equal(leads.get('c@x.com')!.notes, 'ligar terça')
})

test('leads: lead existente continua recebendo atualização de name/phone/city (comportamento anterior)', async () => {
  leads.set('d@x.com', { email: 'd@x.com', name: 'Velho', phone: '1', city: 'A', status: 'novo', notes: null })
  await leadsPOST(post('/api/leads', { email: 'd@x.com', name: 'Novo', phone: '21988887777', city: 'B' }))
  const l = leads.get('d@x.com')!
  assert.deepEqual([l.name, l.phone, l.city], ['Novo', '21988887777', 'B'])
})

test('leads: e-mail ausente ou inválido → 400', async () => {
  for (const email of [undefined, '', 'sem-arroba', 'a@b', 'x'.repeat(300) + '@x.com']) {
    const res = await leadsPOST(post('/api/leads', { name: 'Z', email }))
    assert.equal(res.status, 400, `email=${String(email).slice(0, 20)}`)
  }
  assert.equal(leads.size, 0)
})

test('leads: campos de texto têm tamanho limitado', async () => {
  await leadsPOST(post('/api/leads', { email: 'e@x.com', name: 'N'.repeat(500), phone: '9'.repeat(500), city: 'C'.repeat(500) }))
  const l = leads.get('e@x.com')!
  assert.ok(l.name.length <= 120, 'name')
  assert.ok(l.phone.length <= 30, 'phone')
  assert.ok(l.city.length <= 80, 'city')
})

// ───────────────────── POST /api/notifications/register ─────────────────────

const fresh = (extra: Row = {}) => ({
  id: 'u-new', name: 'Bia', email: 'bia@x.com', phone: '21977776666', city: 'Niterói', createdAt: new Date(), ...extra,
})

test('register: sem token → 401 e nada é enviado ao n8n', async () => {
  const res = await registerPOST(post('/api/notifications/register', { name: 'X', email: 'x@x.com', phone: '21900000000' }))
  assert.equal(res.status, 401)
  assert.equal(fetchCalls.length, 0)
})

test('register: token inválido → 401 e nada é enviado ao n8n', async () => {
  const res = await registerPOST(post('/api/notifications/register', { name: 'X' }, 'token.invalido.aqui'))
  assert.equal(res.status, 401)
  assert.equal(fetchCalls.length, 0)
})

test('register: token válido mas usuário inexistente → 401', async () => {
  const res = await registerPOST(post('/api/notifications/register', {}, tokenFor('fantasma')))
  assert.equal(res.status, 401)
  assert.equal(fetchCalls.length, 0)
})

test('register: dados enviados ao n8n vêm do banco, não do corpo (anti-spoof)', async () => {
  users.set('u-new', fresh())
  const res = await registerPOST(post('/api/notifications/register', { name: 'ATACANTE', email: 'v@vitima.com', phone: '21911112222', city: 'Lugar' }, tokenFor('u-new')))
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
  assert.ok(fetchCalls.length >= 1, 'deve acionar o n8n')
  for (const c of fetchCalls) {
    const s = JSON.stringify(c.body)
    assert.ok(s.includes('bia@x.com') && s.includes('21977776666'), 'usa dados do banco')
    assert.ok(!s.includes('ATACANTE') && !s.includes('vitima.com') && !s.includes('21911112222'), 'ignora o corpo')
  }
})

test('register: conta com mais de 10 minutos não dispara boas-vindas', async () => {
  users.set('u-old', fresh({ id: 'u-old', createdAt: new Date(Date.now() - 60 * 60 * 1000) }))
  const res = await registerPOST(post('/api/notifications/register', {}, tokenFor('u-old')))
  assert.equal(res.status, 200)
  assert.equal(fetchCalls.length, 0)
})

// ─────────────────────── POST /api/auth/login-notify ───────────────────────

test('login-notify: sem token → 401 e nada é enviado ao n8n', async () => {
  users.set('u-a', { id: 'u-a', name: 'Alvo', phone: '21955554444' })
  const res = await loginNotifyPOST(post('/api/auth/login-notify', { userId: 'u-a' }))
  assert.equal(res.status, 401)
  assert.equal(fetchCalls.length, 0)
})

test('login-notify: userId do corpo é ignorado — vale o do token (anti-spoof)', async () => {
  users.set('u-a', { id: 'u-a', name: 'Alvo', phone: '21955554444' })
  users.set('u-b', { id: 'u-b', name: 'Atacante', phone: '21933332222' })
  const res = await loginNotifyPOST(post('/api/auth/login-notify', { userId: 'u-a' }, tokenFor('u-b')))
  assert.equal(res.status, 200)
  assert.equal(fetchCalls.length, 1)
  const s = JSON.stringify(fetchCalls[0].body)
  assert.ok(s.includes('21933332222'), 'notifica o dono do token')
  assert.ok(!s.includes('21955554444'), 'não notifica o userId do corpo')
})

test('login-notify: com token válido mantém o contrato (ok:true e alerta enviado)', async () => {
  users.set('u-a', { id: 'u-a', name: 'Alvo', phone: '21955554444' })
  const res = await loginNotifyPOST(post('/api/auth/login-notify', {}, tokenFor('u-a')))
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
  assert.equal(fetchCalls.length, 1)
  assert.equal(fetchCalls[0].body.phoneWA, '5521955554444')
})
