import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isIosDevice, wasRecentlyDismissed, DISMISS_DAYS } from '../lib/pwa-install'

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
const DESKTOP_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const IPAD_DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'

const DAY = 24 * 60 * 60 * 1000

test('isIosDevice: iPhone Safari é iOS', () => {
  assert.equal(isIosDevice(IPHONE_SAFARI, 5), true)
})

test('isIosDevice: Android e desktop não são iOS', () => {
  assert.equal(isIosDevice(ANDROID_CHROME, 5), false)
  assert.equal(isIosDevice(DESKTOP_CHROME, 0), false)
})

test('isIosDevice: iPad com UA de Mac (iPadOS) é iOS quando tem multitouch', () => {
  assert.equal(isIosDevice(IPAD_DESKTOP_UA, 5), true)
  assert.equal(isIosDevice(IPAD_DESKTOP_UA, 0), false)
})

test('wasRecentlyDismissed: sem registro → false', () => {
  assert.equal(wasRecentlyDismissed(null, Date.now()), false)
})

test('wasRecentlyDismissed: registro inválido → false (nunca bloqueia o prompt por lixo no storage)', () => {
  assert.equal(wasRecentlyDismissed('abc', Date.now()), false)
  assert.equal(wasRecentlyDismissed('', Date.now()), false)
})

test('wasRecentlyDismissed: dentro da janela → true, depois da janela → false', () => {
  const now = Date.now()
  assert.equal(wasRecentlyDismissed(String(now - 1 * DAY), now), true)
  assert.equal(wasRecentlyDismissed(String(now - (DISMISS_DAYS - 1) * DAY), now), true)
  assert.equal(wasRecentlyDismissed(String(now - (DISMISS_DAYS + 1) * DAY), now), false)
})

test('wasRecentlyDismissed: timestamp no futuro (relógio alterado) → false', () => {
  const now = Date.now()
  assert.equal(wasRecentlyDismissed(String(now + 5 * DAY), now), false)
})
