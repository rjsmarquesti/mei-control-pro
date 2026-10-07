'use client'

import { useEffect, useState } from 'react'
import { authFetch, getAccessToken } from '@/lib/session'

export type NotifType = 'danger' | 'warning' | 'info' | 'success'

export interface AppNotification {
  id: string
  type: NotifType
  title: string
  message: string
  href?: string
  read: boolean
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getAccessToken()) { setLoading(false); return }

    authFetch('/api/notifications')
      .then(async (res) => {
        if (!res.ok) return
        setNotifications(await res.json())
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const markAllRead = () => setNotifications((n) => n.map((x) => ({ ...x, read: true })))
  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, markAllRead, loading }
}
