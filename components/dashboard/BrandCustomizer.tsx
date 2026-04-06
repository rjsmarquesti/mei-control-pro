'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Upload, Sun, Moon, Monitor, Check, Palette, Type, Building2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

const PRESET_COLORS = [
  { color: '#7C3AED', label: 'Violeta' },
  { color: '#2563EB', label: 'Azul' },
  { color: '#059669', label: 'Verde' },
  { color: '#D97706', label: 'Âmbar' },
  { color: '#DC2626', label: 'Vermelho' },
  { color: '#DB2777', label: 'Rosa' },
  { color: '#0891B2', label: 'Ciano' },
  { color: '#EA580C', label: 'Laranja' },
]

const FONTS = ['Inter', 'Roboto', 'Poppins', 'Nunito', 'Outfit']

export function BrandCustomizer() {
  const { brandSettings, setBrandSettings } = useAppStore()
  const { setTheme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [customColor, setCustomColor] = useState(brandSettings.primaryColor)

  const handleColorChange = (color: string) => {
    setBrandSettings({ primaryColor: color })
    setCustomColor(color)
    document.documentElement.style.setProperty('--primary', color)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setBrandSettings({ logo: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const handleThemeChange = (t: 'light' | 'dark' | 'system') => {
    setBrandSettings({ theme: t })
    setTheme(t)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass-card p-5 space-y-5"
    >
      <div className="flex items-center gap-2">
        <Palette size={16} style={{ color: brandSettings.primaryColor }} />
        <h3 className="text-sm font-bold text-foreground">Personalização da sua marca</h3>
      </div>

      {/* Logo Upload */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide">Logo</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 hover:opacity-80 group"
          style={{ borderColor: `color-mix(in srgb, ${brandSettings.primaryColor} 40%, transparent)` }}
        >
          {brandSettings.logo ? (
            <div className="flex flex-col items-center gap-2">
              <img src={brandSettings.logo} alt="Logo" className="h-10 object-contain" />
              <span className="text-xs text-muted-foreground">Clique para trocar</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              <div>
                <p className="text-xs font-medium text-foreground">Upload da sua logo</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">PNG, SVG ou JPG</p>
              </div>
            </div>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
      </div>

      {/* Color presets */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide">Cor primária</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {PRESET_COLORS.map(({ color, label }) => (
            <motion.button
              key={color}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleColorChange(color)}
              title={label}
              className="relative h-8 w-full rounded-lg transition-all duration-200"
              style={{ background: color }}
            >
              {brandSettings.primaryColor === color && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Check size={14} className="text-white" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
        {/* Custom color input */}
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-lg shrink-0 border border-border"
            style={{ background: brandSettings.primaryColor }}
          />
          <input
            type="color"
            value={customColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="flex-1 h-8 rounded-lg border border-border bg-muted cursor-pointer"
            title="Cor personalizada"
          />
        </div>
      </div>

      {/* Theme */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide">Tema</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'light', label: 'Claro', icon: Sun },
            { value: 'dark', label: 'Escuro', icon: Moon },
            { value: 'system', label: 'Sistema', icon: Monitor },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleThemeChange(value)}
              className="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all duration-200"
              style={brandSettings.theme === value
                ? { background: `color-mix(in srgb, ${brandSettings.primaryColor} 15%, transparent)`, borderColor: brandSettings.primaryColor, color: brandSettings.primaryColor }
                : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
              }
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide flex items-center gap-1.5">
          <Type size={12} /> Tipografia
        </p>
        <select
          value={brandSettings.typography}
          onChange={(e) => setBrandSettings({ typography: e.target.value })}
          className="input-field text-sm"
        >
          {FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Company name */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide flex items-center gap-1.5">
          <Building2 size={12} /> Nome da empresa
        </p>
        <input
          type="text"
          value={brandSettings.companyName}
          onChange={(e) => setBrandSettings({ companyName: e.target.value })}
          placeholder="Nome da sua empresa"
          className="input-field text-sm"
        />
      </div>

      {/* Features list */}
      <div className="pt-2 border-t border-border/60 space-y-2">
        {[
          'Sua logo no sistema',
          'Cores personalizadas',
          'Tema claro/escuro',
          'Nome da empresa',
        ].map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div
              className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in srgb, ${brandSettings.primaryColor} 20%, transparent)` }}
            >
              <Check size={9} style={{ color: brandSettings.primaryColor }} strokeWidth={3} />
            </div>
            {feature}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
