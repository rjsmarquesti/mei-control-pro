'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem('cookie_consent', 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#12121f',
      borderTop: '1px solid rgba(124,58,237,0.3)',
      padding: '16px 24px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <p style={{ color: '#9ca3c8', fontSize: 13, margin: 0, flex: 1, minWidth: 260 }}>
        🍪 Utilizamos cookies essenciais para o funcionamento do site. Ao continuar, você concorda com nossa{' '}
        <Link href="/privacidade" style={{ color: '#7C3AED', textDecoration: 'none' }}>
          Política de Privacidade
        </Link>{' '}
        e com a{' '}
        <Link href="/termos" style={{ color: '#7C3AED', textDecoration: 'none' }}>
          LGPD
        </Link>.
      </p>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={decline}
          style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#6b7280', fontSize: 13, cursor: 'pointer',
          }}
        >
          Recusar
        </button>
        <button
          onClick={accept}
          style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg,#7C3AED,#4F46E5)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Aceitar
        </button>
      </div>
    </div>
  )
}
