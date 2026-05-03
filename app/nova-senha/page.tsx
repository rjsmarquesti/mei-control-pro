'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, CheckCircle, Lock, ShieldCheck, KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function NovaSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [recoveryToken, setRecoveryToken] = useState('')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session?.access_token) {
        setRecoveryToken(session.access_token)
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    if (!recoveryToken) {
      setError('Sessão inválida. Solicite um novo link de recuperação.')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, accessToken: recoveryToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg: string = (data.error ?? '').toLowerCase()
        if (msg.includes('different') || msg.includes('same') || msg.includes('old password') || res.status === 422) {
          setError('A nova senha não pode ser igual à senha atual.')
        } else if (msg.includes('expir') || msg.includes('invalid') || msg.includes('token')) {
          setError('Link expirado. Solicite um novo link de recuperação.')
        } else {
          setError('Erro ao salvar a senha. Tente novamente.')
        }
      } else {
        setDone(true)
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    }

    setIsLoading(false)
  }

  const passwordStrength = () => {
    if (password.length === 0) return null
    if (password.length < 6) return { level: 0, label: 'Muito fraca', color: '#ef4444' }
    if (password.length < 8) return { level: 1, label: 'Fraca', color: '#f97316' }
    if (/[A-Z]/.test(password) && /[0-9]/.test(password) && password.length >= 8)
      return { level: 3, label: 'Forte', color: '#22c55e' }
    return { level: 2, label: 'Média', color: '#eab308' }
  }

  const strength = passwordStrength()

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 100%)' }}>
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #7C3AED 0%, transparent 60%), radial-gradient(circle at 80% 20%, #06B6D4 0%, transparent 40%)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="MEI Control Pro" width={40} height={40} className="rounded-xl" />
            <span className="text-white font-bold text-xl">MEI Control Pro</span>
          </div>
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Proteja sua<br />conta com segurança
            </h1>
            <p className="text-violet-200 mt-4 text-lg">Crie uma senha forte para manter seus dados financeiros em segurança.</p>
          </div>
          <div className="space-y-4">
            {[
              { icon: ShieldCheck, text: 'Use letras maiúsculas e minúsculas' },
              { icon: KeyRound, text: 'Inclua números e símbolos especiais' },
              { icon: Lock, text: 'Mínimo de 8 caracteres recomendado' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Icon size={16} className="text-violet-300" />
                </div>
                <span className="text-violet-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-violet-400 text-sm">© 2025 MEI Control Pro</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md py-8"
        >
          {/* Mobile logo */}
          <div className="flex items-center justify-center lg:hidden gap-3 mb-8">
            <Image src="/logo.svg" alt="MEI Control Pro" width={36} height={36} className="rounded-xl" />
            <span className="font-bold text-lg text-foreground">MEI Control Pro</span>
          </div>

          <AnimatePresence mode="wait">
            {done ? (
              /* ── SUCCESS STATE ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                {/* Ícone animado */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  <CheckCircle size={40} className="text-green-400" />
                </motion.div>

                <h2 className="text-2xl font-bold text-foreground mb-3">
                  Senha alterada com sucesso!
                </h2>
                <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                  Sua nova senha foi definida. Agora você pode entrar na sua conta com a nova senha.
                </p>

                {/* Caixa de confirmação */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl border p-5 mb-6 text-left"
                  style={{
                    background: 'rgba(34,197,94,0.06)',
                    borderColor: 'rgba(34,197,94,0.2)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck size={16} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">Conta protegida</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Sua senha foi atualizada com segurança. Todas as sessões anteriores foram encerradas por segurança.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  onClick={() => router.push('/login')}
                  className="btn-primary w-full"
                >
                  OK — Ir para o login
                </motion.button>
              </motion.div>
            ) : !ready ? (
              /* ── LOADING / LINK INVÁLIDO ── */
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Nova senha</h2>
                  <p className="text-muted-foreground mt-1 text-sm">Validando link de recuperação...</p>
                </div>
                <div className="rounded-2xl border p-8"
                  style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))' }}>
                  <Loader2 size={32} className="text-violet-400 mx-auto mb-4 animate-spin" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Aguarde enquanto validamos seu link...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Se a página não carregar,{' '}
                    <a href="/recuperar-senha" className="font-semibold underline hover:opacity-80" style={{ color: '#7C3AED' }}>
                      solicite um novo link
                    </a>.
                  </p>
                </div>
              </motion.div>
            ) : (
              /* ── FORM ── */
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-foreground text-center lg:text-left">
                    Criar nova senha
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm text-center lg:text-left">
                    Escolha uma senha segura para sua conta.
                  </p>
                </div>

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
                    {/* Aviso senha diferente */}
                    <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#f59e0b' }}>
                      ⚠ A nova senha deve ser diferente da senha atual
                    </p>
                    {/* Password strength bar */}
                    {strength && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{
                                background: i <= strength.level - 1 ? strength.color : 'hsl(var(--border))',
                              }} />
                          ))}
                        </div>
                        <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                      Confirmar senha
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="input-field pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirm.length > 0 && password !== confirm && (
                      <p className="text-xs text-red-400 mt-1">As senhas não coincidem</p>
                    )}
                    {confirm.length > 0 && password === confirm && confirm.length >= 6 && (
                      <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                        <CheckCircle size={12} /> Senhas coincidem
                      </p>
                    )}
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
                    className="btn-primary w-full mt-2"
                  >
                    {isLoading
                      ? <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                      : 'Salvar nova senha'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
