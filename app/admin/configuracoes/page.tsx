'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Settings, Save, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Setting {
  key: string
  value: string
  label: string | null
  updated_at: string
}

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [feedback, setFeedback] = useState<Record<string, 'ok' | 'error'>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  const checkAdminAndLoad = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Não autenticado. Faça login novamente.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.status === 403) {
        setError('Acesso negado. Apenas administradores podem acessar.')
        setLoading(false)
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(`Erro ao carregar configurações: ${body.error ?? res.status}`)
        setLoading(false)
        return
      }

      const data: Setting[] = await res.json()
      setSettings(data)
      const map: Record<string, string> = {}
      data.forEach(s => { map[s.key] = s.value })
      setValues(map)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (key: string) => {
    setSaving(s => ({ ...s, [key]: true }))
    setFeedback(f => ({ ...f, [key]: undefined as any }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ key, value: values[key] }),
      })
      if (res.ok) {
        setFeedback(f => ({ ...f, [key]: 'ok' }))
        setSettings(s => s.map(x => x.key === key ? { ...x, value: values[key], updated_at: new Date().toISOString() } : x))
        setTimeout(() => setFeedback(f => ({ ...f, [key]: undefined as any })), 3000)
      } else {
        setFeedback(f => ({ ...f, [key]: 'error' }))
      }
    } catch {
      setFeedback(f => ({ ...f, [key]: 'error' }))
    } finally {
      setSaving(s => ({ ...s, [key]: false }))
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin text-blue-400" />
    </div>
  )

  if (error) return (
    <div className="text-center py-16">
      <p className="text-red-400 font-medium">{error}</p>
    </div>
  )

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Configurações do Sistema</h1>
        <p className="text-sm text-slate-400 mt-0.5">Parâmetros globais editáveis pelo administrador</p>
      </div>

      {/* DAS Settings */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Settings size={18} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">DAS — Simples Nacional</h2>
            <p className="text-xs text-slate-400">Valores padrão aplicados a todos os usuários</p>
          </div>
        </div>

        <div className="space-y-5">
          {settings.map(setting => (
            <div key={setting.key}>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
                {setting.label ?? setting.key}
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={values[setting.key] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [setting.key]: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-8 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
                  />
                </div>
                <button
                  onClick={() => handleSave(setting.key)}
                  disabled={saving[setting.key]}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {saving[setting.key]
                    ? <RefreshCw size={14} className="animate-spin" />
                    : <Save size={14} />}
                  Salvar
                </button>
                {feedback[setting.key] === 'ok' && (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                    <CheckCircle2 size={14} /> Salvo
                  </div>
                )}
                {feedback[setting.key] === 'error' && (
                  <div className="flex items-center gap-1.5 text-red-400 text-xs">
                    <AlertCircle size={14} /> Erro
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Última atualização: {formatDate(setting.updated_at)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs text-amber-300 font-medium">Aviso</p>
        <p className="text-xs text-amber-200/70 mt-1">
          O valor padrão é usado apenas como sugestão no formulário de novo DAS.
          Cada usuário digita o valor real ao registrar o pagamento.
          Multa e juros por atraso são configurados individualmente por cada usuário em seu perfil DAS.
        </p>
      </div>
    </div>
  )
}
