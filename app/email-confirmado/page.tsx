'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function EmailConfirmadoPage() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setConfirming(false)
      }
    })
    // Também verifica se já há sessão ativa (caso o redirect já trouxe o token)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setConfirming(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{
      margin: 0, padding: 0, background: '#0b0b18',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#12121f',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '48px 40px',
        maxWidth: 440,
        width: '100%',
        textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 24 }}>
          <img src="/logo.webp" width={48} height={48} alt="MEI Control Pro"
            style={{ borderRadius: 12, display: 'inline-block' }} />
        </div>

        {/* Ícone */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(5,150,105,0.1))',
          border: '1px solid rgba(16,185,129,0.3)',
          fontSize: 32, marginBottom: 24
        }}>✅</div>

        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.3px' }}>
          Email confirmado!
        </h1>

        <p style={{ color: '#9ca3c8', fontSize: 14, lineHeight: 1.7, margin: '0 0 32px' }}>
          Sua conta foi ativada com sucesso.<br />
          Clique abaixo para acessar o MEI Control Pro.
        </p>

        <button
          onClick={() => router.push('/login')}
          style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg,#7C3AED,#4F46E5)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            padding: '13px 40px',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
            width: '100%'
          }}
        >
          Acessar o sistema →
        </button>

        <p style={{ color: '#374151', fontSize: 11, marginTop: 24, lineHeight: 1.6 }}>
          © 2025 MEI Control Pro · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
