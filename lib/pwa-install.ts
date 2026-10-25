export const DISMISS_KEY = 'pwa-install-dismissed-at'
export const DISMISS_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

// iPadOS 13+ se identifica como Mac; o multitouch é o que o distingue de um Mac real.
export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1
}

export function wasRecentlyDismissed(stored: string | null, now: number): boolean {
  if (!stored) return false
  const at = Number(stored)
  if (!Number.isFinite(at) || at > now) return false
  return now - at < DISMISS_DAYS * DAY_MS
}
