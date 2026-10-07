'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Key, Copy, Check, Loader2 } from 'lucide-react'
import { useAdmin } from '@/hooks/useAdmin'

export default function MeiKitPage() {
  const { isAdmin, loading: authLoading, token } = useAdmin()
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<{ email: string; code: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setError('')
    setResult(null)
    if (!email.trim()) { setError('Informe o e-mail do cliente.'); return }
    if (!token) { setError('Sessão expirada. Faça login novamente.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/mei-kit-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao gerar código.'); return }
      setResult(data)
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!result) return
    await navigator.clipboard.writeText(result.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Verificando acesso...</div>
  if (!isAdmin) return null

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Key size={20} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg">MEI Kit — Gerador de Código</h1>
          <p className="text-slate-400 text-sm">Gera o código de ativação para vendas fora da Play Store</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-2">E-mail do cliente</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="cliente@email.com"
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Gerando...</> : 'Gerar código'}
        </button>
      </div>

      {result && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6 space-y-3">
          <p className="text-slate-400 text-sm">Código para <span className="text-white font-medium">{result.email}</span></p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-mono font-bold text-white tracking-widest flex-1">{result.code}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors"
            >
              {copied ? <><Check size={14} className="text-green-400" /> Copiado</> : <><Copy size={14} /> Copiar</>}
            </button>
          </div>
          <p className="text-slate-500 text-xs">Envie este código para o cliente via WhatsApp ou e-mail junto com o APK.</p>
        </div>
      )}

      <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4 space-y-2">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Como funciona</p>
        <ul className="text-slate-500 text-xs space-y-1 list-disc list-inside">
          <li>O código é determinístico: mesmo e-mail sempre gera o mesmo código</li>
          <li>O cliente insere e-mail + código no app para ativar</li>
          <li>A ativação é validada online e registrada no banco</li>
          <li>Para revogar, marque <code className="text-purple-400">revoked=true</code> na tabela <code className="text-purple-400">sismei.activations</code></li>
        </ul>
      </div>
    </div>
  )
}
