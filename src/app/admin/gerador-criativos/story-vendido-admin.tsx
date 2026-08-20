'use client'

/**
 * Story "VENDIDO" (1080×1920) — UI do admin.
 *
 * Este arquivo NÃO desenha nada. Todo o desenho vive em
 * content/admin/creative/story-vendido.ts, que é porte 1:1 do gerador Python e
 * está calibrado (grade, cores, stops do gradiente). Aqui só há formulário,
 * escolha da foto e export.
 *
 * POR QUE EM REACT, E NÃO DENTRO DO HTML DO GERADOR:
 * content/admin/gerador-criativos.html é um arquivo único auto-contido, com um
 * <script> sem módulos e assets em base64 (1,2 MB). O story-vendido.ts é um
 * módulo ES com import/export e depende de fontes servidas por URL. Enfiá-lo
 * ali significaria ou inlinar o módulo à mão — perdendo o vínculo com o fonte —
 * ou converter o HTML inteiro para módulos. Como a página do gerador já é
 * React, o Story entra como ABA dela: mesma porta de entrada para o operador,
 * sem inchar um arquivo que já tem histórico de quebrar.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Loader2, Search, AlertTriangle, Upload, Image as ImageIcon } from 'lucide-react'
import {
  renderStory, fotoDoVeiculo, carregar, fontesProntas, exportarPng,
  type Veiculo, type Assets,
} from '@content/admin/creative/story-vendido'
import '@content/admin/creative/fonts.css'

/** O slot do card é 960×720. Origem na mesma razão ⇒ corte zero. */
const RAZAO_ALVO = 4 / 3
/** Tolerância de 0,5%: JPEG do estoque às vezes sai 1920×1439. */
const TOLERANCIA = 0.005

interface VeiculoEstoque {
  id: string
  brand?: string
  model?: string
  year?: string | number
  mileage?: string | number
  photos?: string[]
}

function slug(s: string) {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function hoje() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

export function StoryVendidoAdmin() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [titulo, setTitulo] = useState('')
  const [spec, setSpec] = useState('')
  const [selo, setSelo] = useState('VENDIDO')
  const [mostrarSite, setMostrarSite] = useState(false)

  const [nomeArquivo, setNomeArquivo] = useState('')
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<VeiculoEstoque[]>([])
  const [buscando, setBuscando] = useState(false)

  const [assets, setAssets] = useState<Assets | null>(null)
  const [carregandoFoto, setCarregandoFoto] = useState(false)
  const [avisoRazao, setAvisoRazao] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [fontesOk, setFontesOk] = useState(false)
  const [baixando, setBaixando] = useState(false)

  // As fontes precisam estar prontas ANTES do primeiro measureText: sem isso o
  // canvas mede com fallback e o letter-spacing sai errado. Os assets fixos
  // (caminhão e bandeira) carregam junto — não dependem do veículo.
  const fixosRef = useRef<{ caminhao: CanvasImageSource; bandeira?: CanvasImageSource } | null>(null)
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const [caminhao, bandeira] = await Promise.all([
          carregar('/creative/truck-base.webp'),
          carregar('/creative/flag-br.png'),
        ])
        await fontesProntas()
        if (!vivo) return
        fixosRef.current = { caminhao, bandeira }
        setFontesOk(true)
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => { vivo = false }
  }, [])

  /**
   * Aceita a foto já carregada e só decide sobre proporção e assets.
   *
   * Duas origens, dois caminhos: a do ESTOQUE passa por fotoDoVeiculo(), que
   * usa /_next/image — buscar do S3 direto tinge o canvas e quebra o toBlob().
   * A do UPLOAD vira object URL, que é mesma origem por construção e não tinge.
   */
  const usarFoto = useCallback((foto: HTMLImageElement) => {
    try {
      const razao = foto.naturalWidth / foto.naturalHeight
      const desvio = Math.abs(razao / RAZAO_ALVO - 1)
      if (desvio > TOLERANCIA) {
        // Não bloqueia o render — só diz QUAL será o corte, que é o que o
        // operador precisa para decidir se troca de foto.
        const eixo = razao > RAZAO_ALVO ? 'as laterais' : 'topo e base'
        const perda = razao > RAZAO_ALVO
          ? 1 - RAZAO_ALVO / razao
          : 1 - razao / RAZAO_ALVO
        setAvisoRazao(
          `Foto ${foto.naturalWidth}×${foto.naturalHeight} (${razao.toFixed(3)}:1) não é 4:3. ` +
          `O enquadramento vai cortar ${eixo} em ~${(perda * 100).toFixed(1)}%.`,
        )
      } else {
        setAvisoRazao(null)
      }
      const fixos = fixosRef.current
      if (!fixos) throw new Error('assets fixos ainda não carregaram')
      setAssets({ foto, caminhao: fixos.caminhao, bandeira: fixos.bandeira })
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }, [])

  /** Foto do estoque: precisa do proxy de mesma origem. */
  const aplicarDoEstoque = useCallback(async (url: string) => {
    if (!url) return
    setCarregandoFoto(true); setErro(null)
    try {
      usarFoto(await fotoDoVeiculo(url))
      setNomeArquivo('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setCarregandoFoto(false)
    }
  }, [usarFoto])

  /**
   * Upload do computador. O object URL é revogado assim que a imagem decodifica
   * — o canvas desenha a partir do bitmap, não da URL, então segurá-la só
   * vazaria memória a cada troca de foto.
   */
  const aplicarUpload = useCallback(async (file: File) => {
    setCarregandoFoto(true); setErro(null)
    const url = URL.createObjectURL(file)
    try {
      usarFoto(await carregar(url))
      setNomeArquivo(file.name)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      URL.revokeObjectURL(url)
      setCarregandoFoto(false)
    }
  }, [usarFoto])

  async function buscarEstoque() {
    if (!busca.trim()) { setResultados([]); return }
    setBuscando(true); setErro(null)
    try {
      const r = await fetch(`/api/vehicles?search=${encodeURIComponent(busca)}&limit=8`)
      const d = await r.json()
      setResultados(d?.vehicles ?? [])
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setBuscando(false)
    }
  }

  function escolher(v: VeiculoEstoque) {
    const nome = [v.brand, v.model].filter(Boolean).join(' ')
    if (nome) setTitulo(nome)
    const km = v.mileage != null ? `${Number(v.mileage).toLocaleString('pt-BR')} km` : null
    setSpec([v.year, km].filter(Boolean).join(' · '))
    setResultados([])
    const primeira = v.photos?.[0]
    if (primeira) void aplicarDoEstoque(primeira)
    else setErro('Esse veículo não tem foto no estoque.')
  }

  // Debounce: os campos de texto disparam a cada tecla e o render faz blur de
  // 72px sobre 1080×1920 — sem espera a digitação engasga.
  useEffect(() => {
    if (!assets || !fontesOk || !canvasRef.current || !titulo.trim()) return
    const id = setTimeout(() => {
      const v: Veiculo = {
        titulo,
        spec: spec.trim() || null,
        site: mostrarSite ? 'ATTRAVEICULOS.COM.BR' : null,
        selo: selo.trim() || 'VENDIDO',
      }
      try {
        renderStory(canvasRef.current!, v, assets)
        setErro(null)
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e))
      }
    }, 120)
    return () => clearTimeout(id)
  }, [assets, fontesOk, titulo, spec, selo, mostrarSite])

  async function baixar() {
    if (!canvasRef.current) return
    setBaixando(true); setErro(null)
    try {
      const blob = await exportarPng(canvasRef.current)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attra-vendido-${slug(titulo) || 'veiculo'}-${hoje()}.png`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    } catch (e) {
      // SecurityError aqui significa canvas tingido — foto que não passou pelo
      // proxy de mesma origem.
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setBaixando(false)
    }
  }

  const pronto = !!assets && fontesOk && !!titulo.trim()

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* ---------- formulário ---------- */}
      <div className="space-y-5">
        <section className="rounded-lg border border-border bg-background-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Veículo do estoque</h3>
          <div className="flex gap-2">
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void buscarEstoque() } }}
              placeholder="Ex.: McLaren GTS, G-63, RAM 2500…"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <button
              type="button" onClick={() => void buscarEstoque()} disabled={buscando}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </div>

          {resultados.length > 0 && (
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border">
              {resultados.map(v => (
                <li key={v.id}>
                  <button
                    type="button" onClick={() => escolher(v)}
                    className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-background-soft"
                  >
                    {[v.brand, v.model, v.year].filter(Boolean).join(' ')}
                    <span className="ml-2 text-xs text-foreground-secondary">
                      {v.photos?.length ?? 0} fotos
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="mt-4 block text-xs font-medium text-foreground-secondary">
            …ou envie a foto do computador
          </label>
          <div className="mt-1 flex items-center gap-3">
            <label className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-background-soft">
              {carregandoFoto ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Escolher imagem</span>
              )}
              <input
                type="file" accept="image/*" className="hidden" disabled={carregandoFoto}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) void aplicarUpload(f)
                  e.target.value = ''   // permite reenviar o MESMO arquivo
                }}
              />
            </label>
            {nomeArquivo && (
              <span className="truncate text-xs text-foreground-secondary">{nomeArquivo}</span>
            )}
          </div>
          <p className="mt-1 text-xs text-foreground-secondary">
            Do estoque, a foto passa pelo <code>/_next/image</code> — buscar do S3 direto tinge o
            canvas e o download falha. Do computador não há esse risco: o arquivo é lido da própria
            página. Melhor resultado em 4:3 (ex.: 1920×1440).
          </p>
        </section>

        <section className="rounded-lg border border-border bg-background-card p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground-secondary">
              Título <span className="text-primary">*</span>
            </label>
            <input
              value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="McLaren GTS"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary">
              Spec (opcional)
            </label>
            <input
              value={spec} onChange={e => setSpec(e.target.value)}
              placeholder="2024 · 3.100 km"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <p className="mt-1 text-xs text-foreground-secondary">
              Preenchido, o título sobe 28px e a spec entra abaixo.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary">Selo</label>
            <input
              value={selo} onChange={e => setSelo(e.target.value)}
              placeholder="VENDIDO"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <p className="mt-1 text-xs text-foreground-secondary">
              Também aceita RESERVADO ou ENTREGUE.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox" checked={mostrarSite}
              onChange={e => setMostrarSite(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Exibir domínio (ATTRAVEICULOS.COM.BR)
          </label>
        </section>

        {avisoRazao && (
          <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{avisoRazao}</span>
          </div>
        )}
        {erro && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
            {erro}
          </div>
        )}
      </div>

      {/* ---------- prévia ---------- */}
      <div className="space-y-3">
        <div
          className="relative overflow-hidden rounded-lg border border-border bg-background-soft"
          style={{ aspectRatio: '9 / 16' }}
        >
          <canvas ref={canvasRef} className="block h-full w-full" />
          {!pronto && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-xs text-foreground-secondary">
              <ImageIcon className="h-6 w-6" />
              {!fontesOk
                ? 'Carregando fontes e assets…'
                : !assets
                  ? 'Escolha um veículo do estoque ou cole a URL de uma foto.'
                  : 'Escreva o título.'}
            </div>
          )}
        </div>
        <button
          type="button" onClick={() => void baixar()} disabled={!pronto || baixando}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
        >
          {baixando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Baixar PNG (1080 × 1920)
        </button>
      </div>
    </div>
  )
}
