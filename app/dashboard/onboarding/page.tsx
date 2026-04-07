'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Building2, FileText, Tag, Calendar, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [form, setForm] = useState({
    company: '',
    cnpj: '',
    activity: '',
    meiSince: new Date().getFullYear().toString(),
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }
      setUserId(session.user.id)
    })
  }, [router])

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14)
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  }

  const handleSkip = () => router.push('/dashboard')

  const handleSave = async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      await supabase.from('profiles').update({
        company: form.company,
        cnpj: form.cnpj,
        activity: form.activity,
        mei_since: form.meiSince,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
      setStep(3)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch {
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-violet-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">M</div>
          <h1 className="text-2xl font-bold text-foreground">Quase lá!</h1>
          <p className="text-muted-foreground mt-1 text-sm">Complete as informações do seu negócio</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted">
              <motion.div
                className="h-full rounded-full"
                style={{ background: '#7C3AED' }}
                initial={{ width: 0 }}
                animate={{ width: step >= s ? '100%' : '0%' }}
                transition={{ duration: 0.4 }}
              />
            </div>
          ))}
        </div>

        {step === 3 ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8"
          >
            <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-foreground">Tudo pronto!</h2>
            <p className="text-muted-foreground mt-2">Redirecionando para o dashboard...</p>
          </motion.div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Nome da empresa / MEI
              </label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="João Silva Serviços ME"
                  className="input-field pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                CNPJ
              </label>
              <div className="relative">
                <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: formatCnpj(e.target.value) })}
                  placeholder="00.000.000/0001-00"
                  className="input-field pl-9"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              Continuar <ArrowRight size={16} />
            </button>

            <button onClick={handleSkip} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
              Preencher depois
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Atividade principal
              </label>
              <div className="relative">
                <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={form.activity}
                  onChange={(e) => setForm({ ...form, activity: e.target.value })}
                  placeholder="Ex: Desenvolvimento de software"
                  className="input-field pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                MEI desde (ano)
              </label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  value={form.meiSince}
                  onChange={(e) => setForm({ ...form, meiSince: e.target.value })}
                  placeholder="2023"
                  min="2009"
                  max={new Date().getFullYear()}
                  className="input-field pl-9"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isLoading}
              className="btn-primary w-full mt-2"
            >
              {isLoading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : 'Concluir cadastro'}
            </button>

            <button onClick={handleSkip} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
              Preencher depois
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
