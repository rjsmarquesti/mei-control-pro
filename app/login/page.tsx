'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, TrendingUp, Shield, BarChart3, User, Phone, MapPin, Sun, Moon, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTheme } from 'next-themes'

export default function LoginPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')

  const [planoParam, setPlanoParam] = useState('')

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('cadastro') === '1') setMode('register')
      const plano = params.get('plano') ?? ''
      if (plano) setPlanoParam(plano)
    }
  }, [])

  const checkPasswordStrength = (pwd: string) => {
    const rules = [
      { label: 'Mínimo 8 caracteres', pass: pwd.length >= 8 },
      { label: 'Uma letra maiúscula', pass: /[A-Z]/.test(pwd) },
      { label: 'Um número', pass: /[0-9]/.test(pwd) },
      { label: 'Um símbolo (!@#$%^&*)', pass: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd) },
    ]
    const score = rules.filter(r => r.pass).length
    return { score, rules }
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        // Notificar usuário via WhatsApp (fire-and-forget, não bloqueia)
        fetch('/api/auth/login-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authData.user!.id }),
        }).catch(() => {})

        // Redirect admin users to admin panel
        const res = await fetch('/api/me/role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authData.session!.access_token}` },
          body: JSON.stringify({}),
        })
        const { role } = await res.json()

        const dest = role === 'admin' ? '/admin' : planoParam ? `/dashboard/assinatura?checkout=${planoParam}` : '/dashboard'
        router.push(dest)
      } else {
        const { score } = checkPasswordStrength(password)
        if (score < 3) {
          setError('Crie uma senha mais forte para proteger sua conta.')
          setIsLoading(false)
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, phone, city },
            emailRedirectTo: `${window.location.origin}/email-confirmado`,
          },
        })
        if (error) throw error

        if (data.user) {
          await fetch('/api/profiles/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
            body: JSON.stringify({ id: data.user.id, name, email, phone, city }),
          }).catch(() => {})

          // Capturar como lead (via API para bypasear RLS)
          await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, city, status: 'novo', notes: 'Cadastro gratuito via app' }),
          }).catch(() => {})

          // Notificar via n8n (WhatsApp + email)
          try {
            await fetch('https://n8n.divulgabr.com.br/webhook/mei-cadastro', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name,
                email,
                phone,
                city,
                instance: 'sismei',
                numero: '5521980485675',
                mensagem: `🎉 Bem-vindo(a) ao MEI Control Pro!\n\nOlá, *${name}*! Seu cadastro foi realizado com sucesso.\n\n📧 *E-mail cadastrado:* ${email}\n📱 *Telefone:* ${phone}\n\n⚠️ *Ação necessária:* Para ativar sua conta, confirme seu cadastro clicando no link enviado para o e-mail acima.\n\nApós a confirmação, você terá acesso completo ao sistema para gerenciar suas finanças como MEI.\n\nQualquer dúvida, estamos à disposição! 😊\n\n🔗 https://app.sismeipro.com.br`,
              }),
            })
          } catch {
            // notificação opcional, não bloqueia o cadastro
          }

          // Disparar sequência de nutrição de leads (fire and forget)
          fetch('https://n8n.divulgabr.com.br/webhook/mei-nutricao-trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, city }),
          }).catch(() => {})
        }
        router.push(planoParam ? `/dashboard/assinatura?checkout=${planoParam}` : '/dashboard/onboarding')
      }
    } catch (err: any) {
      const msg = err.message ?? ''
      if (msg.includes('Invalid login credentials')) setError('Email ou senha incorretos')
      else if (msg.includes('already registered')) setError('Este email já está cadastrado')
      else setError(msg || 'Erro ao autenticar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Theme toggle */}
      {mounted && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 bg-muted/40 text-xs font-medium hover:bg-muted transition-colors"
        >
          <Sun size={14} className="dark:hidden text-amber-500" />
          <Moon size={14} className="hidden dark:block text-violet-400" />
          <span>{theme === 'dark' ? 'Escuro' : 'Claro'}</span>
        </motion.button>
      )}

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
        <p className="relative z-10 text-violet-400/60 text-xs">© 2025 MEI Control Pro · CNPJ 50.406.025/0001-68</p>
        <p className="relative z-10 text-violet-400/40 text-[10px] mt-1">Serviço privado de assessoria · Sem vínculo com o governo</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md py-8"
        >
          <div className="mb-6">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-5 lg:hidden">
              <Image src="/logo.svg" alt="MEI Control Pro" width={36} height={36} className="rounded-xl" />
              <span className="font-bold text-lg text-foreground">MEI Control Pro</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground text-center lg:text-left">
              {mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm text-center lg:text-left">
              {mode === 'login' ? 'Bem-vindo de volta!' : 'Comece gratuitamente hoje'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Nome completo
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome completo"
                      required
                      className="input-field pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Celular / WhatsApp (com DDD)
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(11) 99999-0000"
                      required
                      className="input-field pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Cidade
                  </label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="São Paulo, SP"
                      required
                      className="input-field pl-9"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
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

              {/* Indicador de força — só no cadastro */}
              {mode === 'register' && password.length > 0 && (() => {
                const { score, rules } = checkPasswordStrength(password)
                const colors = ['#EF4444', '#EF4444', '#F59E0B', '#F59E0B', '#10B981']
                const labels = ['Muito fraca', 'Fraca', 'Média', 'Boa', 'Forte']
                return (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="h-1.5 flex-1 rounded-full transition-all"
                          style={{ background: i < score ? colors[score] : 'hsl(var(--border))' }} />
                      ))}
                    </div>
                    <p className="text-xs font-medium" style={{ color: colors[score] }}>{labels[score]}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {rules.map(r => (
                        <div key={r.label} className="flex items-center gap-1.5">
                          {r.pass
                            ? <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                            : <XCircle size={11} className="text-muted-foreground shrink-0" />}
                          <span className={`text-[10px] ${r.pass ? 'text-emerald-400' : 'text-muted-foreground'}`}>{r.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
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
                ? <><Loader2 size={16} className="animate-spin" /> Aguarde...</>
                : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>

            {mode === 'login' && (
              <div className="text-center">
                <a
                  href="/recuperar-senha"
                  className="text-sm text-muted-foreground hover:opacity-80 transition-opacity"
                >
                  Esqueci minha senha
                </a>
              </div>
            )}
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              className="font-semibold hover:opacity-80 transition-opacity"
              style={{ color: '#7C3AED' }}
            >
              {mode === 'login' ? 'Criar conta grátis' : 'Fazer login'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
