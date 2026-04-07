'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, MapPin, Building2, Calendar, Save, Loader2, Key } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAppStore } from '@/store/useAppStore'

export default function PerfilPage() {
  const { user, brandSettings } = useAppStore()
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: user?.name ?? 'Rogério',
    email: user?.email ?? 'rogerio@meicontrolpro.com',
    phone: '(11) 99999-0000',
    cnpj: '12.345.678/0001-90',
    company: user?.company ?? 'Rogério Dev ME',
    activity: 'Desenvolvimento de Software',
    city: 'São Paulo, SP',
    meiSince: user?.meiSince ?? '2023',
  })

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 1000))
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const fields = [
    { label: 'Nome completo', key: 'name', icon: User, type: 'text' },
    { label: 'Email', key: 'email', icon: Mail, type: 'email' },
    { label: 'Telefone', key: 'phone', icon: Phone, type: 'tel' },
    { label: 'CNPJ', key: 'cnpj', icon: Building2, type: 'text' },
    { label: 'Nome da empresa', key: 'company', icon: Building2, type: 'text' },
    { label: 'Atividade principal', key: 'activity', icon: Building2, type: 'text' },
    { label: 'Cidade/Estado', key: 'city', icon: MapPin, type: 'text' },
    { label: 'MEI desde', key: 'meiSince', icon: Calendar, type: 'text' },
  ] as const

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
            {form.name.charAt(0)}
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{form.name}</p>
            <p className="text-sm text-muted-foreground">{form.email}</p>
            <p className="text-xs text-muted-foreground mt-1">{form.company} · MEI desde {form.meiSince}</p>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="text-sm font-bold text-foreground mb-5">Dados pessoais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(({ label, key, icon: Icon, type }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Icon size={11} /> {label}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="input-field"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={handleSave} disabled={isSaving} className="btn-primary gap-2">
              {isSaving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : saved ? '✓ Salvo!' : <><Save size={15} /> Salvar alterações</>}
            </button>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
          <h3 className="text-sm font-bold text-foreground mb-5 flex items-center gap-2"><Key size={15} /> Segurança</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Senha atual</label>
              <input type="password" placeholder="••••••••" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Nova senha</label>
              <input type="password" placeholder="••••••••" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Confirmar nova senha</label>
              <input type="password" placeholder="••••••••" className="input-field" />
            </div>
            <button className="btn-outline gap-2"><Key size={15} /> Alterar senha</button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
