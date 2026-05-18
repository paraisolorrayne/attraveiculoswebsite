'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Settings,
  Volume2,
  Mic,
  Loader2,
  Check,
  X,
  RefreshCw,
  LogOut,
  AlertCircle,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

interface SiteSettings {
  listen_to_content_enabled: boolean
  engine_sound_section_enabled: boolean
}

interface SettingConfig {
  key: keyof SiteSettings
  label: string
  description: string
  icon: React.ReactNode
}

const settingsConfig: SettingConfig[] = [
  {
    key: 'listen_to_content_enabled',
    label: 'Leitura em Voz Alta (Blog)',
    description: 'Exibe o botão "Ouvir esta matéria" nos artigos do blog, permitindo que visitantes ouçam o conteúdo narrado por síntese de voz.',
    icon: <Mic className="w-5 h-5" />,
  },
  {
    key: 'engine_sound_section_enabled',
    label: 'Seção Som do Motor',
    description: 'Exibe a seção "Som do Motor" na página inicial, permitindo que visitantes ouçam o ronco dos motores dos veículos cadastrados.',
    icon: <Volume2 className="w-5 h-5" />,
  },
]

export function SettingsAdmin() {
  const [settings, setSettings] = useState<SiteSettings>({
    listen_to_content_enabled: true,
    engine_sound_section_enabled: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successKey, setSuccessKey] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data.settings) {
        setSettings(data.settings)
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Erro ao carregar configurações')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSetting = async (key: keyof SiteSettings) => {
    setSavingKey(key)
    setError(null)
    setSuccessKey(null)
    
    const newValue = !settings[key]
    
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newValue }),
      })
      
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      
      if (res.status === 403) {
        setError('Apenas administradores podem alterar configurações')
        return
      }
      
      if (!res.ok) {
        throw new Error('Failed to update setting')
      }
      
      setSettings(prev => ({ ...prev, [key]: newValue }))
      setSuccessKey(key)
      setTimeout(() => setSuccessKey(null), 2000)
    } catch (err) {
      console.error('Error updating setting:', err)
      setError('Erro ao salvar configuração')
    } finally {
      setSavingKey(null)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Configurações do Site</h1>
              <p className="text-xs text-foreground-secondary">Funcionalidades de Áudio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-foreground-secondary hover:text-foreground hover:bg-background-soft rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-foreground-secondary">
            Gerencie as funcionalidades de áudio do site
          </p>
          <button
            onClick={fetchSettings}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-background-soft transition-colors text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Atualizar
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {settingsConfig.map((config) => (
              <div
                key={config.key}
                className="bg-background-card border border-border rounded-xl p-6 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-xl transition-colors",
                      settings[config.key]
                        ? "bg-primary/10 text-primary"
                        : "bg-foreground-secondary/10 text-foreground-secondary"
                    )}>
                      {config.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {config.label}
                      </h3>
                      <p className="text-sm text-foreground-secondary">
                        {config.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    {successKey === config.key && (
                      <span className="text-emerald-500 text-sm font-medium flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Salvo
                      </span>
                    )}

                    <button
                      onClick={() => toggleSetting(config.key)}
                      disabled={savingKey === config.key}
                      className={cn(
                        "relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-wait disabled:opacity-70",
                        settings[config.key] ? "bg-primary" : "bg-foreground-secondary/30"
                      )}
                      role="switch"
                      aria-checked={settings[config.key]}
                      aria-label={`Toggle ${config.label}`}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          settings[config.key] ? "translate-x-5" : "translate-x-0"
                        )}
                      >
                        {savingKey === config.key ? (
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        ) : settings[config.key] ? (
                          <Check className="w-3 h-3 text-primary" />
                        ) : (
                          <X className="w-3 h-3 text-foreground-secondary" />
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mt-4 pt-4 border-t border-border">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                    settings[config.key]
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-amber-500/10 text-amber-500"
                  )}>
                    {settings[config.key] ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Habilitado
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Desabilitado
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-xl">
          <h4 className="font-semibold text-foreground mb-2">💡 Informações</h4>
          <ul className="text-sm text-foreground-secondary space-y-2">
            <li>• As alterações são aplicadas imediatamente em todo o site.</li>
            <li>• Quando uma funcionalidade está desabilitada, o componente não é renderizado.</li>
            <li>• Apenas usuários com role <code className="px-1.5 py-0.5 bg-background-soft rounded text-xs font-mono">admin</code> podem alterar estas configurações.</li>
          </ul>
        </div>
      </main>
    </div>
  )
}

