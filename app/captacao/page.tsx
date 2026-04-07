'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Loader2, TrendingUp, BarChart3, Shield, User, Phone, MapPin, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function CaptacaoPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: dbError } = await supabase.from('leads').insert({
        name,
        email,
        phone,
        city,
        status: 'novo',
      })

      if (dbError) throw dbError

      // Notify admin via n8n
      try {
        await fetch('https://n8n.divulgabr.com.br/webhook/mei-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, city }),
        })
      } catch {
        // notification is optional
      }

      setSuccess(true)
    } catch (err: any) {
      setError('Erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #0d0d1a 0%, #0d1b3e 50%, #1a0533 100%)' }}>

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #7C3AED 0%, transparent 50%), radial-gradient(circle at 80% 20%, #06B6D4 0%, transparent 40%)' }} />

      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 px-6 py-12 relative z-10 max-w-5xl mx-auto w-full">

        {/* Left: value proposition */}
        <div className="flex-1 text-center lg:text-left">
          <div className="flex items-center gap-3 mb-8 justify-center lg:justify-start">
            <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold text-lg">M</div>
            <span className="text-white font-bold text-xl">MEI Control Pro</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Sua gestão MEI<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
              finalmente simples
            </span>
          </h1>
          <p className="text-violet-200 text-lg mb-8">
            Controle faturamento, DAS e IRPF em um só lugar.<br />Comece grátis, sem cartão.
          </p>
          <div className="space-y-4">
            {[
              { icon: TrendingUp, text: 'Controle de receitas e despesas em tempo real' },
              { icon: BarChart3, text: 'Relatórios automáticos para declaração do IRPF' },
              { icon: Shield, text: 'Alertas de limite MEI e vencimento do DAS' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-violet-300" />
                </div>
                <span className="text-violet-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: form */}
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Recebemos seu interesse!</h2>
                  <p className="text-violet-200 text-sm">
                    Nossa equipe entrará em contato em breve pelo WhatsApp que você informou.
                  </p>
                  <a
                    href="/login"
                    className="mt-6 inline-block px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all"
                  >
                    Criar minha conta agora
                  </a>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold text-white mb-1">Quero conhecer</h2>
                  <p className="text-violet-300 text-sm mb-6">Preencha seus dados e entraremos em contato.</p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Seu nome completo"
                        required
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-violet-400/60 text-sm outline-none focus:border-violet-500/50 transition-all"
                      />
                    </div>

                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Seu melhor email"
                        required
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-violet-400/60 text-sm outline-none focus:border-violet-500/50 transition-all"
                      />
                    </div>

                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(formatPhone(e.target.value))}
                        placeholder="(11) 99999-0000"
                        required
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-violet-400/60 text-sm outline-none focus:border-violet-500/50 transition-all"
                      />
                    </div>

                    <div className="relative">
                      <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" />
                      <input
                        type="text"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="Sua cidade, Estado"
                        required
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-violet-400/60 text-sm outline-none focus:border-violet-500/50 transition-all"
                      />
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-red-400 text-center"
                      >
                        {error}
                      </motion.p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {loading ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : 'Quero saber mais'}
                    </button>

                    <p className="text-center text-xs text-violet-400/70">
                      Já tem conta?{' '}
                      <a href="/login" className="text-violet-300 hover:text-white transition-colors font-medium">
                        Fazer login
                      </a>
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-violet-500 text-xs relative z-10">
        © 2025 MEI Control Pro · Todos os direitos reservados
      </footer>
    </div>
  )
}
