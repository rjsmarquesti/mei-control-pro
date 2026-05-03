'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, MapPin, Building2, Calendar, Save, Loader2, Key } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'

export default function PerfilPage() {
  const { brandSettings, setUser } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', email: '', phone: '', cnpj: '',
    company: '', activity: '', city: '', meiSince: '',
  })

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUserId(session.user.id)

      const { data } = await supabase
        .from('profiles')
        .select('name,email,phone,city,company,mei_since,cnpj,activity')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setForm({
          name: data.name ?? '',
          email: data.email ?? session.user.email ?? '',
          phone: data.phone ?? '',
          cnpj: data.cnpj ?? '',
          company: data.company ?? '',
          activity: data.activity ?? '',
          city: data.city ?? '',
          meiSince: data.mei_since ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!userId) return
    setIsSaving(true)
    setSaveError('')
    const { error } = await supabase.from('profiles').update({
      name: form.name,
      phone: form.phone,
      cnpj: form.cnpj,
      company: form.company,
      activity: form.activity,
      city: form.city,
      mei_since: form.meiSince,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)

    if (error) {
      setSaveError('Erro ao salvar. Tente novamente.')
    } else {
      setUser({ id: userId, name: form.name, email: form.email, company: form.company, meiSince: form.meiSince })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setIsSaving(false)
  }

  const handlePasswordChange = async () => {
    if (pwForm.next !== pwForm.confirm) { setPwMsg('As senhas não coincidem.'); return }
    if (pwForm.next.length < 6) { setPwMsg('A senha deve ter pelo menos 6 caracteres.'); return }
    setPwSaving(true)
    setPwMsg('')
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    if (error) { setPwMsg('Erro ao alterar senha: ' + error.message) }
    else { setPwMsg('Senha alterada com sucesso!'); setPwForm({ current: '', next: '', confirm: '' }) }
    setPwSaving(false)
  }

  const fields: { label: string; key: keyof typeof form; icon: any; type: string; readOnly?: boolean }[] = [
    { label: 'Nome completo', key: 'name', icon: User, type: 'text' },
    { label: 'Email', key: 'email', icon: Mail, type: 'email', readOnly: true },
    { label: 'Telefone', key: 'phone', icon: Phone, type: 'tel' },
    { label: 'CNPJ', key: 'cnpj', icon: Building2, type: 'text' },
    { label: 'Nome da empresa', key: 'company', icon: Building2, type: 'text' },
    { label: 'Atividade principal', key: 'activity', icon: Building2, type: 'text' },
    { label: 'Cidade/Estado', key: 'city', icon: MapPin, type: 'text' },
    { label: 'MEI desde', key: 'meiSince', icon: Calendar, type: 'text' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-xl font-bold text-foreground">Perfil</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus dados pessoais e do negócio</p>
        </div>

        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 flex items-center gap-5">
          <div className="h-20 w-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0"
            style={{ background: `linear-gradient(135deg, ${brandSettings.primaryColor}, color-mix(in srgb, ${brandSettings.primaryColor} 70%, #06B6D4))` }}>
            {form.name.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{form.name || '—'}</p>
            <p className="text-sm text-muted-foreground">{form.email}</p>
            <p className="text-xs text-muted-foreground mt-1">{form.company || 'Empresa'} · MEI desde {form.meiSince || '—'}</p>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="text-sm font-bold text-foreground mb-5">Dados pessoais</h3>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(({ label, key, icon: Icon, type, readOnly }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Icon size={11} /> {label}
                  </label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => !readOnly && setForm({ ...form, [key]: e.target.value })}
                    readOnly={readOnly}
                    className={`input-field ${readOnly ? 'opacity-60 cursor-default' : ''}`}
                  />
                </div>
              ))}
            </div>
          )}

          {saveError && <p className="text-sm text-red-400 mt-3">{saveError}</p>}

          <div className="flex gap-3 mt-6">
            <button onClick={handleSave} disabled={isSaving || loading} className="btn-primary gap-2">
              {isSaving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : saved ? '✓ Salvo!' : <><Save size={15} /> Salvar alterações</>}
            </button>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
          <h3 className="text-sm font-bold text-foreground mb-5 flex items-center gap-2"><Key size={15} /> Segurança</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Nova senha</label>
              <input type="password" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} placeholder="••••••••" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Confirmar nova senha</label>
              <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="••••••••" className="input-field" />
            </div>
            {pwMsg && (
              <p className={`text-sm ${pwMsg.includes('sucesso') ? 'text-emerald-400' : 'text-red-400'}`}>{pwMsg}</p>
            )}
            <button onClick={handlePasswordChange} disabled={pwSaving} className="btn-outline gap-2">
              {pwSaving ? <><Loader2 size={15} className="animate-spin" /> Alterando...</> : <><Key size={15} /> Alterar senha</>}
            </button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
