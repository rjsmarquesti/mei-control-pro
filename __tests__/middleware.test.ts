import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { middleware, config } from '../middleware'

let seq = 0
function call(path: string, ip: string) {
  return middleware(new NextRequest(`http://localhost${path}`, { method: 'POST', headers: { 'x-forwarded-for': ip } }))
}

function limitOf(path: string): number {
  const ip = `10.0.0.${++seq}`
  let n = 0
  while (n < 100) {
    const res = call(path, ip)
    if (res.status === 429) return n
    n++
  }
  return n
}

test('middleware: /api/leads limita a 10 req/min por IP', () => {
  assert.equal(limitOf('/api/leads'), 10)
})

test('middleware: /api/notifications/register limita a 5 req/min por IP', () => {
  assert.equal(limitOf('/api/notifications/register'), 5)
})

test('middleware: limite é por IP (outro IP não é afetado)', () => {
  const a = `10.1.0.${++seq}`
  for (let i = 0; i < 10; i++) call('/api/leads', a)
  assert.equal(call('/api/leads', a).status, 429)
  assert.notEqual(call('/api/leads', `10.1.0.${++seq}`).status, 429)
})

test('middleware: matcher do Next inclui as rotas novas (senão o middleware nem roda)', () => {
  assert.ok(config.matcher.includes('/api/leads'), '/api/leads')
  assert.ok(config.matcher.includes('/api/notifications/register'), '/api/notifications/register')
})

test('middleware: rota já coberta (/api/auth/login-notify) continua limitada a 10/min', () => {
  assert.equal(limitOf('/api/auth/login-notify'), 10)
})

test('middleware: rota não listada continua sem limite', () => {
  const ip = `10.2.0.${++seq}`
  for (let i = 0; i < 50; i++) assert.notEqual(call('/api/transactions', ip).status, 429)
})
