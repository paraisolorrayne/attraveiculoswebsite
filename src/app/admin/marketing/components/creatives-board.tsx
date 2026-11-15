'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, Download, CheckCircle2, ImageOff, RefreshCw } from 'lucide-react'
import {
  BarraDeFiltros,
  BotaoSecundario,
  CampoBusca,
  EstadoErro,
  EstadoVazio,
  ResumoDosFiltros,
  SeletorFiltro,
  useFiltrosUrl,
  type FiltroLigado,
} from '@/components/admin/filtros'
import { termosDaBusca } from '@/lib/crm-busca'
import {
  FORMATOS_CRIATIVO,
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

// Chaves próprias na URL (cq, formato, autor) para não brigar com as das tarefas.
const CHAVES_CRIATIVOS = ['cq', 'formato', 'autor'] as const

// Mesmo critério da busca do CRM: minúsculas e sem acento dos dois lados.
const semAcento = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function CreativesBoard() {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const { valores, definir, limpar } = useFiltrosUrl(CHAVES_CRIATIVOS)
  const [publishing, setPublishing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErro(false)
    try {
      const r = await fetch('/api/admin/marketing/creatives')
      // Falha não pode parecer fila vazia: quem vê "nenhum criativo" deixa de publicar.
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      setCreatives(d.creatives || [])
    } catch (e) {
      console.error('Erro ao carregar criativos:', e)
      setErro(true)
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

  const aoBuscar = useCallback((v: string) => definir({ cq: v }), [definir])

  // Só quem de fato tem peça na fila entra no filtro "Criado por".
  const autores = useMemo(
    () =>
      [...new Set(creatives.map(c => c.created_by_name).filter((n): n is string => !!n))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .map(n => ({ valor: n, rotulo: n })),
    [creatives],
  )

  const filtrados = useMemo(() => {
    const termos = termosDaBusca(valores.cq)
    return creatives.filter(c => {
      if (termos.length > 0) {
        const alvo = semAcento(c.vehicle_name || '')
        if (!termos.every(t => alvo.includes(t))) return false
      }
      // Compara pelo rótulo: linha antiga sem formato conta como Stories, igual ao card.
      if (valores.formato && rotuloFormatoCriativo(c.format) !== rotuloFormatoCriativo(valores.formato)) return false
      if (valores.autor && c.created_by_name !== valores.autor) return false
      return true
    })
  }, [creatives, valores.cq, valores.formato, valores.autor])

  const filtrosLigados: FiltroLigado[] = []
  if (valores.cq) filtrosLigados.push({ rotulo: `Busca: ${valores.cq}`, aoRemover: () => definir({ cq: '' }) })
  if (valores.formato) filtrosLigados.push({ rotulo: `Formato: ${rotuloFormatoCriativo(valores.formato)}`, aoRemover: () => definir({ formato: '' }) })
  if (valores.autor) filtrosLigados.push({ rotulo: `Criado por: ${valores.autor}`, aoRemover: () => definir({ autor: '' }) })

  if (loading && creatives.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (erro && creatives.length === 0) {
    return <EstadoErro texto="Não foi possível carregar a fila de criativos." aoTentar={load} />
  }

  if (creatives.length === 0) {
    return (
      <div className="max-w-md mx-auto p-12 text-center bg-background-card border border-border rounded-xl">
        <ImageOff className="w-8 h-8 mx-auto text-foreground-secondary mb-3" />
        <p className="text-foreground font-medium">Nenhum criativo para publicar</p>
        <p className="text-sm text-foreground-secondary mt-2">
          Cada peça baixada no Gerador de Criativos chega aqui sozinha, em dois
          formatos (<strong>Stories 9:16</strong> e <strong>Feed 4:5</strong>), em
          qualidade cheia, sem passar por WhatsApp.
        </p>
      </div>
    )
  }

  return (
    <div>
      {erro && (
        <div className="mb-4">
          <EstadoErro texto="Não foi possível atualizar a fila. A lista abaixo pode estar desatualizada." aoTentar={load} />
        </div>
      )}

      <p className="text-sm text-foreground-secondary mb-4">
        Criativos aguardando publicação: baixe em qualidade cheia e, após subir na Meta,
        marque como publicado.
      </p>

      <BarraDeFiltros className="mb-3">
        <CampoBusca valor={valores.cq} aoMudar={aoBuscar} placeholder="Buscar por veículo" />
        <SeletorFiltro
          rotulo="Formato"
          valor={valores.formato}
          aoMudar={v => definir({ formato: v })}
          opcoes={FORMATOS_CRIATIVO.map(f => ({ valor: f, rotulo: rotuloFormatoCriativo(f) }))}
        />
        {autores.length > 0 && (
          <SeletorFiltro
            rotulo="Criado por"
            valor={valores.autor}
            aoMudar={v => definir({ autor: v })}
            opcoes={autores}
          />
        )}
        <button
          onClick={load}
          className="ml-auto flex h-11 items-center gap-2 px-4 border border-border rounded-lg text-sm text-foreground hover:bg-background-soft transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </BarraDeFiltros>

      <ResumoDosFiltros
        className="mb-4"
        total={creatives.length}
        mostrando={filtrados.length}
        nome={['criativo', 'criativos']}
        filtros={filtrosLigados}
        aoLimpar={limpar}
      />

      {filtrados.length === 0 && (
        <EstadoVazio
          Icon={ImageOff}
          titulo="Nenhum criativo com esses filtros"
          texto="Há criativos na fila, mas nenhum combina com a busca ou com os filtros escolhidos."
          acao={<BotaoSecundario onClick={limpar}>Limpar filtros</BotaoSecundario>}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtrados.map(c => (
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
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-foreground-secondary">
                    {rotuloFormatoCriativo(c.format)}
                  </span>
                </div>
                <div className="text-xs text-foreground-secondary">
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
