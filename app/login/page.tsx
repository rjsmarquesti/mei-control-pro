'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, TrendingUp, Shield, BarChart3, User, Phone, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')

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
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, phone, city } },
        })
        if (error) throw error

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name,
            email,
            phone,
            city,
            updated_at: new Date().toISOString(),
          })
        }
        router.push('/dashboard/onboarding')
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
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 100%)' }}>
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #7C3AED 0%, transparent 60%), radial-gradient(circle at 80% 20%, #06B6D4 0%, transparent 40%)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold text-lg">M</div>
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
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
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
