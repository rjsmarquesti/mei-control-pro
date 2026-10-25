'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { DISMISS_KEY, isIosDevice, wasRecentlyDismissed } from '@/lib/pwa-install'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Mode = 'android' | 'ios' | null

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function readDismissed(): string | null {
  try { return localStorage.getItem(DISMISS_KEY) } catch { return null }
}

export function InstallPrompt() {
  const { brandSettings } = useAppStore()
  const [mode, setMode] = useState<Mode>(null)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed(readDismissed(), Date.now())) return

    if (isIosDevice(navigator.userAgent, navigator.maxTouchPoints)) {
      setMode('ios')
      return
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setMode('android')
    }
    const onInstalled = () => { setMode(null); setDeferred(null) }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* storage bloqueado: só fecha nesta sessão */ }
    setMode(null)
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setMode(null)
  }

  if (!mode) return null

  return (
    <div
      role="region"
      aria-label="Instalar aplicativo"
      className="lg:hidden fixed left-3 right-3 z-[58] rounded-2xl border border-border/60 bg-surface/95 backdrop-blur-xl shadow-lg p-3 flex items-center gap-3"
      style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      <div
        className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-white"
        style={{ background: brandSettings.primaryColor }}
        aria-hidden="true"
      >
        {mode === 'ios' ? <Share size={18} /> : <Download size={18} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Instale o MEI Control Pro</p>
        <p className="text-xs text-muted-foreground">
          {mode === 'ios'
            ? 'Toque em Compartilhar e depois em “Adicionar à Tela de Início”.'
            : 'Acesse direto da tela inicial, sem abrir o navegador.'}
        </p>
      </div>

      {mode === 'android' && (
        <button
          type="button"
          onClick={install}
          className="shrink-0 min-h-[44px] px-4 rounded-xl text-sm font-semibold text-white active:opacity-80"
          style={{ background: brandSettings.primaryColor }}
        >
          Instalar
        </button>
      )}

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar aviso de instalação"
        className="shrink-0 h-11 w-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <X size={18} />
      </button>
    </div>
  )
}
