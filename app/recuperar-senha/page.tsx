'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Loader2, ArrowLeft, CheckCircle, TrendingUp, Shield, BarChart3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

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
              Gestão financeira<br />para MEI de verdade
            </h1>
            <p className="text-violet-200 mt-4 text-lg">Controle seu faturamento, DAS e IRPF em um só lugar.</p>
          </div>
          <div className="space-y-4">
            {[
              { icon: TrendingUp, text: 'Acompanhe receitas e despesas em tempo real' },
              { icon: BarChart3, text: 'Relatórios automáticos para o IRPF' },
              { icon: Shield, text: 'Alertas de limite MEI e vencimento do DAS' },
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
          <div className="flex items-center justify-center lg:hidden gap-3 mb-6">
            <Image src="/logo.svg" alt="MEI Control Pro" width={36} height={36} className="rounded-xl" />
            <span className="font-bold text-lg text-foreground">MEI Control Pro</span>
          </div>

          <AnimatePresence mode="wait">
            {sent ? (
              /* ── SUCCESS STATE ── */
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  <CheckCircle size={40} className="text-green-400" />
                </motion.div>

                <h2 className="text-2xl font-bold text-foreground mb-3">Email enviado!</h2>
                <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                  Enviamos um link de recuperação para<br />
                  <strong className="text-foreground">{email}</strong>
                </p>

                <div className="rounded-2xl border p-5 mb-6 text-left"
                  style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))' }}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Próximos passos</p>
                  {[
                    'Abra o email que enviamos',
                    'Clique em "Criar nova senha"',
                    'Defina sua nova senha',
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 mb-2 last:mb-0">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: 'white' }}>
                        {i + 1}
                      </div>
                      <span className="text-sm text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mb-6">
                  Não recebeu? Verifique a pasta de spam ou{' '}
                  <button
                    onClick={() => { setSent(false); setEmail('') }}
                    className="font-semibold underline hover:opacity-80 transition-opacity"
                    style={{ color: '#7C3AED' }}
                  >
                    tente novamente
                  </button>.
                </p>

                <Link
                  href="/login"
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Voltar ao login
                </Link>
              </motion.div>
            ) : (
              /* ── FORM ── */
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
                  <ArrowLeft size={16} />
                  Voltar ao login
                </Link>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-foreground text-center lg:text-left">
                    Recuperar senha
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm text-center lg:text-left">
                    Informe seu email e enviaremos um link para criar uma nova senha.
                  </p>
                </div>

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
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
