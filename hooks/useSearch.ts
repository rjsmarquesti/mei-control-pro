'use client'

import { useState, useCallback } from 'react'
import { authFetch, getAccessToken } from '@/lib/session'

export type SearchResultType = 'transaction' | 'page' | 'das' | 'category'

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle: string
  href: string
  badge?: string
  badgeColor?: string
}

const PAGES: SearchResult[] = [
  { id: 'p-dashboard',   type: 'page', title: 'Dashboard',       subtitle: 'Visão geral',                  href: '/dashboard',                badge: 'Página', badgeColor: '#6B7280' },
  { id: 'p-receitas',    type: 'page', title: 'Receitas',         subtitle: 'Lançamentos de entrada',        href: '/dashboard/receitas',       badge: 'Página', badgeColor: '#10B981' },
  { id: 'p-despesas',    type: 'page', title: 'Despesas',         subtitle: 'Lançamentos de saída',          href: '/dashboard/despesas',       badge: 'Página', badgeColor: '#EF4444' },
  { id: 'p-financeiro',  type: 'page', title: 'Financeiro',       subtitle: 'Saúde financeira completa',     href: '/dashboard/financeiro',     badge: 'Página', badgeColor: '#06B6D4' },
  { id: 'p-relatorios',  type: 'page', title: 'Relatórios',       subtitle: 'Análise detalhada',             href: '/dashboard/relatorios',     badge: 'Página', badgeColor: '#7C3AED' },
  { id: 'p-das',         type: 'page', title: 'DAS & Impostos',   subtitle: 'Simples Nacional',              href: '/dashboard/das',            badge: 'Página', badgeColor: '#F59E0B' },
  { id: 'p-irpf',        type: 'page', title: 'IRPF Anual',       subtitle: 'Declaração de imposto de renda',href: '/dashboard/irpf',           badge: 'Página', badgeColor: '#F59E0B' },
  { id: 'p-categorias',  type: 'page', title: 'Categorias',       subtitle: 'Organizar lançamentos',         href: '/dashboard/categorias',     badge: 'Página', badgeColor: '#8B5CF6' },
  { id: 'p-perfil',      type: 'page', title: 'Perfil',           subtitle: 'Dados pessoais e empresa',      href: '/dashboard/perfil',         badge: 'Página', badgeColor: '#6B7280' },
  { id: 'p-assinatura',  type: 'page', title: 'Assinatura',       subtitle: 'Planos e pagamentos',           href: '/dashboard/assinatura',     badge: 'Página', badgeColor: '#7C3AED' },
]

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (query: string) => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) { setResults([]); return }

    setLoading(true)

    const pageResults = PAGES.filter(p =>
      p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
    )

    if (!getAccessToken()) {
      setResults(pageResults.slice(0, 8))
      setLoading(false)
      return
    }

    const res = await authFetch(`/api/search?q=${encodeURIComponent(q)}`)
    const data = res.ok ? await res.json() : { transactions: [], dasPayments: [], categories: [] }

    const txResults: SearchResult[] = (data.transactions ?? []).map((tx: { id: string; description: string; category: string; value: number; type: string; date: string }) => ({
      id: tx.id,
      type: 'transaction',
      title: tx.description,
      subtitle: `${tx.category} · R$ ${Number(tx.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · ${new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}`,
      href: tx.type === 'revenue' ? '/dashboard/receitas' : '/dashboard/despesas',
      badge: tx.type === 'revenue' ? 'Receita' : 'Despesa',
      badgeColor: tx.type === 'revenue' ? '#10B981' : '#EF4444',
    }))

    const dasResults: SearchResult[] = (data.dasPayments ?? [])
      .filter((d: { due_date: string; status: string }) => {
        const month = new Date(d.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        return month.toLowerCase().includes(q) || d.status.includes(q)
      })
      .map((d: { id: string; due_date: string; value: number; status: string }) => ({
        id: d.id,
        type: 'das',
        title: `DAS – ${new Date(d.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        subtitle: `R$ ${Number(d.value).toFixed(2).replace('.', ',')} · ${d.status}`,
        href: '/dashboard/das',
        badge: 'DAS',
        badgeColor: '#F59E0B',
      }))

    const catResults: SearchResult[] = (data.categories ?? []).map((c: { id: string; name: string; type: string }) => ({
      id: c.id,
      type: 'category',
      title: c.name,
      subtitle: c.type === 'revenue' ? 'Categoria de Receita' : 'Categoria de Despesa',
      href: '/dashboard/categorias',
      badge: 'Categoria',
      badgeColor: '#8B5CF6',
    }))

    setResults([...pageResults, ...txResults, ...dasResults, ...catResults].slice(0, 10))
    setLoading(false)
  }, [])

  const clear = () => setResults([])

  return { results, loading, search, clear }
}
