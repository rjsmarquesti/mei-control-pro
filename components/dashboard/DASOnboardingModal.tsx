'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Loader2, Receipt } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface DASRow {
  competencia: string // YYYY-MM
  due_date: string
  value: string
  status: 'paid' | 'pending' | 'overdue'
  paid_at: string
}

const emptyRow = (): DASRow => ({
  competencia: '',
  due_date: '',
  value: '',
  status: 'paid',
  paid_at: '',
})

interface Props {
  userId: string
  onClose: () => void
  onSaved: () => void
}

export default function DASOnboardingModal({ userId, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<DASRow[]>([emptyRow()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (i: number, field: keyof DASRow, val: string) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  const addRow = () => setRows(prev => [...prev, emptyRow()])
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i))

  // Auto-preenche due_date ao digitar competência (vencimento = dia 20 do mês seguinte)
  const handleCompetencia = (i: number, val: string) => {
    update(i, 'competencia', val)
    if (val.length === 7) {
      const [y, m] = val.split('-').map(Number)
      const next = new Date(y, m, 20) // month is 0-indexed, so m = next month
      const due = next.toISOString().split('T')[0]
      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, competencia: val, due_date: due } : r))
    }
  }

  const handleSave = async () => {
    const valid = rows.filter(r => r.competencia && r.due_date && r.value)
    if (valid.length === 0) { setError('Preencha ao menos um DAS.'); return }
    setSaving(true)
    setError('')
    const inserts = valid.map(r => ({
      user_id: userId,
      competencia: r.competencia,
      due_date: r.due_date,
      value: parseFloat(r.value),
      status: r.status,
      paid_at: r.status === 'paid' && r.paid_at ? r.paid_at : null,
    }))
    const { error: err } = await supabase.from('das_payments').insert(inserts)
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#12121f] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <Receipt size={18} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Histórico de DAS</h2>
              <p className="text-xs text-slate-400">Adicione seus pagamentos anteriores para completar o extrato</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-slate-400"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end bg-white/3 rounded-xl p-3 border border-white/5">
              <div className="col-span-3">
                <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Competência</label>
                <input type="month" value={row.competencia} onChange={e => handleCompetencia(i, e.target.value)}
                  className="input-field text-xs w-full" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Vencimento</label>
                <input type="date" value={row.due_date} onChange={e => update(i, 'due_date', e.target.value)}
                  className="input-field text-xs w-full" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Valor (R$)</label>
                <input type="number" step="0.01" placeholder="70.60" value={row.value} onChange={e => update(i, 'value', e.target.value)}
                  className="input-field text-xs w-full" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Status</label>
                <select value={row.status} onChange={e => update(i, 'status', e.target.value as DASRow['status'])}
                  className="input-field text-xs w-full">
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                  <option value="overdue">Em atraso</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Data pagto.</label>
                <input type="date" value={row.paid_at} onChange={e => update(i, 'paid_at', e.target.value)}
                  disabled={row.status !== 'paid'}
                  className="input-field text-xs w-full disabled:opacity-30" />
              </div>
              <div className="col-span-1 flex justify-end">
                {rows.length > 1 && (
                  <button onClick={() => removeRow(i)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <button onClick={addRow} className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors py-1">
            <Plus size={13} /> Adicionar outro mês
          </button>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/8">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-all">
            Pular por agora
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar histórico'}
          </button>
        </div>
      </div>
    </div>
  )
}
