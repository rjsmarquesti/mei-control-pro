'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    })

    if (error) {
      setError('Erro ao enviar o email. Verifique o endereço e tente novamente.')
    } else {
      setSent(true)
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft size={16} />
          Voltar ao login
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Recuperar senha</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Informe seu email e enviaremos um link para criar uma nova senha.
          </p>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6 text-center"
          >
            <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
            <h2 className="font-semibold text-foreground mb-2">Email enviado!</h2>
            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para redefinir sua senha.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Não recebeu? Verifique a pasta de spam.
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="input-field pl-9"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading
                ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                : 'Enviar link de recuperação'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
