'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Download, CheckCircle2, ImageOff, RefreshCw } from 'lucide-react'
import {
  rotuloFormatoCriativo,
  sufixoArquivoCriativo,
  proporcaoFormatoCriativo,
} from '@/lib/marketing-creatives'

interface Creative {
  id: string
  image_url: string
  vehicle_name: string | null
  created_by_name: string | null
  format: string | null   // 'stories' | 'feed' — linhas antigas podem vir sem
  created_at: string
}

function fmtData(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function CreativesBoard() {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/marketing/creatives')
      const d = await r.json()
      setCreatives(d.creatives || [])
    } catch {
      /* silencioso — mostra estado vazio */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const publicar = async (id: string) => {
    if (!window.confirm('Marcar como publicado? O criativo será removido daqui e do servidor.')) return
    setPublishing(id)
    try {
      const r = await fetch(`/api/admin/marketing/creatives/${id}`, { method: 'DELETE' })
      if (r.ok) setCreatives(prev => prev.filter(c => c.id !== id))
    } finally {
      setPublishing(null)
    }
  }

  if (loading && creatives.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (creatives.length === 0) {
    return (
      <div className="max-w-md mx-auto p-12 text-center bg-background-card border border-border rounded-xl">
        <ImageOff className="w-8 h-8 mx-auto text-foreground-secondary mb-3" />
        <p className="text-foreground font-medium">Nenhum criativo para publicar</p>
        <p className="text-sm text-foreground-secondary mt-2">
          Cada peça baixada no Gerador de Criativos chega aqui sozinha, em dois
          formatos — <strong>Stories 9:16</strong> e <strong>Feed 4:5</strong> — em
          qualidade cheia, sem passar por WhatsApp.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-foreground-secondary">
          {creatives.length} criativo(s) aguardando publicação — baixe em qualidade cheia e,
          após subir na Meta, marque como publicado.
        </p>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm text-foreground hover:bg-background-soft transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {creatives.map(c => (
          <div key={c.id} className="bg-background-card border border-border rounded-xl overflow-hidden flex flex-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.image_url}
              alt={c.vehicle_name || 'Criativo'}
              className="w-full object-cover bg-background-soft"
              style={{ aspectRatio: proporcaoFormatoCriativo(c.format) }}
              loading="lazy"
            />
            <div className="p-3 flex flex-col gap-2 flex-1">
              <div className="min-h-[2.5rem]">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-foreground truncate">
                    {c.vehicle_name || 'Criativo'}
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground-secondary">
                    {rotuloFormatoCriativo(c.format)}
                  </span>
                </div>
                <div className="text-[11px] text-foreground-secondary">
                  {c.created_by_name ? `por ${c.created_by_name}` : ''} · {fmtData(c.created_at)}
                </div>
              </div>
              <div className="mt-auto flex flex-col gap-2">
                <a
                  href={c.image_url}
                  download={`${(c.vehicle_name || 'criativo').replace(/[^a-z0-9]+/gi, '-')}-${sufixoArquivoCriativo(c.format)}.png`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar HD
                </a>
                <button
                  onClick={() => publicar(c.id)}
                  disabled={publishing === c.id}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-background-soft transition-colors disabled:opacity-50"
                >
                  {publishing === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  Publicado
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
