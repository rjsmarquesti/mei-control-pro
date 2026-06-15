'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Settings, Save, RefreshCw, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Setting {
  key: string
  value: string
  label: string | null
  updated_at: string
}

const DAS_KEYS = ['das_default_value']
const ANDROID_KEYS = ['mei_limite_anual', 'irpf_tabela']

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [feedback, setFeedback] = useState<Record<string, 'ok' | 'error'>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')

  useEffect(() => { checkAdminAndLoad() }, [])

  const checkAdminAndLoad = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Não autenticado.'); setLoading(false); return }
      setToken(session.access_token)

      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.status === 403) { setError('Acesso negado.'); setLoading(false); return }
      if (!res.ok) { setError(`Erro ${res.status}`); setLoading(false); return }

      const data: Setting[] = await res.json()
      setSettings(data)
      const map: Record<string, string> = {}
      data.forEach(s => {
        map[s.key] = s.key === 'irpf_tabela'
          ? JSON.stringify(JSON.parse(s.value), null, 2)
          : s.value
      })
      setValues(map)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (key: string) => {
    // Validar JSON antes de salvar
    if (key === 'irpf_tabela') {
      try { JSON.parse(values[key]) } catch {
        setFeedback(f => ({ ...f, [key]: 'error' }))
        return
      }
    }

    setSaving(s => ({ ...s, [key]: true }))
    setFeedback(f => ({ ...f, [key]: undefined as any }))
    try {
      const valueToSave = key === 'irpf_tabela'
        ? JSON.stringify(JSON.parse(values[key])) // minify antes de salvar
        : values[key]

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ key, value: valueToSave }),
      })
      if (res.ok) {
        setFeedback(f => ({ ...f, [key]: 'ok' }))
        setSettings(s => s.map(x => x.key === key ? { ...x, value: valueToSave, updated_at: new Date().toISOString() } : x))
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const settingMap = Object.fromEntries(settings.map(s => [s.key, s]))

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-blue-400" /></div>
  if (error) return <div className="text-center py-16"><p className="text-red-400 font-medium">{error}</p></div>

  const renderFeedback = (key: string) => (
    <>
      {feedback[key] === 'ok' && <div className="flex items-center gap-1.5 text-emerald-400 text-xs"><CheckCircle2 size={14} /> Salvo</div>}
      {feedback[key] === 'error' && <div className="flex items-center gap-1.5 text-red-400 text-xs"><AlertCircle size={14} /> Erro</div>}
    </>
  )

  const renderSaveBtn = (key: string) => (
    <button
      onClick={() => handleSave(key)}
      disabled={saving[key]}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-60"
    >
      {saving[key] ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
      Salvar
    </button>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Configurações do Sistema</h1>
        <p className="text-sm text-slate-400 mt-0.5">Parâmetros globais editáveis pelo administrador</p>
      </div>

      {/* DAS */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Settings size={18} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">DAS — Simples Nacional</h2>
            <p className="text-xs text-slate-400">Valor padrão sugerido no formulário de novo DAS</p>
          </div>
        </div>
        <div className="space-y-5">
          {DAS_KEYS.filter(k => settingMap[k]).map(key => {
            const s = settingMap[key]
            return (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
                  {s.label ?? key}
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={values[key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-8 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>
                  {renderSaveBtn(key)}
                  {renderFeedback(key)}
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Última atualização: {formatDate(s.updated_at)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* App Android */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Smartphone size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">App Android — MEI Control Pro Kit</h2>
            <p className="text-xs text-slate-400">Valores consumidos pelo app via <code className="text-slate-300">/api/mei-config</code></p>
          </div>
        </div>
        <div className="space-y-6">

          {/* Limite MEI */}
          {settingMap['mei_limite_anual'] && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
                {settingMap['mei_limite_anual'].label ?? 'Limite anual MEI'}
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                  <input
                    type="number" step="1" min="0"
                    value={values['mei_limite_anual'] ?? ''}
                    onChange={e => setValues(v => ({ ...v, mei_limite_anual: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-8 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
                  />
                </div>
                {renderSaveBtn('mei_limite_anual')}
                {renderFeedback('mei_limite_anual')}
              </div>
              <p className="text-xs text-slate-500 mt-1.5">Última atualização: {formatDate(settingMap['mei_limite_anual'].updated_at)}</p>
            </div>
          )}

          {/* Tabela IRPF */}
          {settingMap['irpf_tabela'] && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
                Tabela IRPF (JSON — faixas anuais)
              </label>
              <textarea
                rows={10}
                value={values['irpf_tabela'] ?? ''}
                onChange={e => setValues(v => ({ ...v, irpf_tabela: e.target.value }))}
                spellCheck={false}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 resize-y"
              />
              <div className="flex items-center gap-3 mt-2">
                {renderSaveBtn('irpf_tabela')}
                {renderFeedback('irpf_tabela')}
                <span className="text-xs text-slate-500">JSON inválido será rejeitado</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Campos: <code className="text-slate-400">limite</code> (número ou 999999999 para última faixa), <code className="text-slate-400">aliquota</code> (decimal), <code className="text-slate-400">deducao</code> (valor em R$)
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Última atualização: {formatDate(settingMap['irpf_tabela'].updated_at)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs text-amber-300 font-medium">Aviso</p>
        <p className="text-xs text-amber-200/70 mt-1">
          O valor do DAS é apenas sugestão no formulário. O app Android consome os valores via <code>/api/mei-config</code> com cache de 24h — alterações levam até 24h para refletir nos dispositivos.
        </p>
      </div>
    </div>
  )
}
