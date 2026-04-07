'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, CheckCircle, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NovaSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase sets the session from the URL hash when the reset link is clicked
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // Also check if session already exists (in case onAuthStateChange fired before mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setIsLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Erro ao atualizar a senha. O link pode ter expirado.')
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 3000)
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Nova senha</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Crie uma nova senha para sua conta.
          </p>
        </div>

        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6 text-center"
          >
            <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
            <h2 className="font-semibold text-foreground mb-2">Senha atualizada!</h2>
            <p className="text-sm text-muted-foreground">
              Redirecionando para o dashboard...
            </p>
          </motion.div>
        ) : !ready ? (
          <div className="rounded-2xl border border-white/10 bg-surface p-6 text-center">
            <Lock size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Validando link de recuperação...
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Se a página não carregar, o link pode ter expirado.{' '}
              <a href="/recuperar-senha" className="underline hover:opacity-80">
                Solicitar novo link
              </a>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Nova senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Confirmar senha
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="input-field"
              />
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
                ? <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
