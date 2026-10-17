'use client'

/**
 * Story "VENDIDO" (1080×1920) — UI do admin.
 *
 * Este arquivo NÃO desenha nada: o desenho é content/admin/creative/
 * story-vendido.ts ("Rota até o cliente", 17/10/2026). Aqui ficam o
 * formulário, a escolha da foto, a cidade de entrega, o tema e o download.
 *
 * O Story é uma ABA da página do gerador, montada junto com as outras e
 * escondida: nada pesado carrega antes de ser preciso. A lista de municípios
 * (~190 KB) só vem quando o campo de cidade ganha foco.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Loader2, Search, Upload, Image as ImageIcon, X, AlertTriangle } from 'lucide-react'
import {
  renderStory, fotoDoVeiculo, carregar, exportarPng, SELOS,
  type AssetsVendido, type Selo, type TemaVendido,
} from '@content/admin/creative/story-vendido'
import { buscarCidades, lerMunicipios, type Cidade, type ContornoUF } from '@content/admin/creative/vendido/calculos'
import { carregarAssets } from '@content/admin/creative/gerador/assets'
import { FOLHA_GOOGLE, fontesDoGerador } from '@content/admin/creative/gerador/fontes'

interface VeiculoEstoque {
  id: string
  brand?: string
  model?: string
  year?: string | number
  photos?: string[]
}

type Fixos = Omit<AssetsVendido, 'foto'>

const TEMAS: { id: TemaVendido; rotulo: string }[] = [
  { id: 'claro', rotulo: 'Claro' },
  { id: 'escuro', rotulo: 'Escuro' },
]

function slug(s: string) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function hoje() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

const miniatura = (url: string) => `/_next/image?url=${encodeURIComponent(url)}&w=256&q=75`

let municipios: Promise<Cidade[]> | null = null

/** Uma vez por sessão do navegador; se falhar, a próxima tentativa busca de novo. */
function carregarMunicipios(): Promise<Cidade[]> {
  municipios ??= fetch('/creative/vendido/municipios.json')
    .then(r => {
      if (!r.ok) throw new Error(`municípios: HTTP ${r.status}`)
      return r.json()
    })
    .then(lerMunicipios)
    .catch(e => {
      municipios = null
      throw e
    })
  return municipios
}

/** Botões de escolha única (situação, tema). */
function Escolha<T extends string>({ rotulo, opcoes, valor, aoMudar }: {
  rotulo: string
  opcoes: { id: T; rotulo: string }[]
  valor: T
  aoMudar: (v: T) => void
}) {
  return (
    <div>
      <span className="block text-xs font-medium text-foreground-secondary">{rotulo}</span>
      <div role="radiogroup" aria-label={rotulo} className="mt-1 inline-flex flex-wrap gap-1 rounded-md border border-border p-1">
        {opcoes.map(o => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={valor === o.id}
            onClick={() => aoMudar(o.id)}
            className={
              'rounded px-3 py-1.5 text-sm font-medium transition-colors ' +
              (valor === o.id ? 'bg-primary text-white' : 'text-foreground-secondary hover:bg-background-soft hover:text-foreground')
            }
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Campo de cidade com sugestões dos 5.570 municípios do IBGE. */
function CampoCidade({ valor, aoEscolher }: { valor: Cidade | null; aoEscolher: (c: Cidade | null) => void }) {
  const [texto, setTexto] = useState('')
  const [cidades, setCidades] = useState<Cidade[] | null>(null)
  const [falha, setFalha] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)

  const sugestoes = useMemo(
    () => (cidades && !valor ? buscarCidades(cidades, texto) : []),
    [cidades, texto, valor],
  )

  function preparar() {
    if (cidades) return
    carregarMunicipios().then(setCidades, e => setFalha(e instanceof Error ? e.message : String(e)))
  }

  function escolher(c: Cidade) {
    aoEscolher(c)
    setTexto(`${c.nome} – ${c.uf}`)
    setAberto(false)
  }

  const listaAberta = aberto && sugestoes.length > 0

  return (
    <div className="relative">
      <label htmlFor="vendido-cidade" className="block text-xs font-medium text-foreground-secondary">
        Cidade de entrega
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="vendido-cidade"
          role="combobox"
          aria-expanded={listaAberta}
          aria-controls="vendido-cidades"
          aria-autocomplete="list"
          aria-activedescendant={listaAberta ? `vendido-cidade-${ativo}` : undefined}
          autoComplete="off"
          value={texto}
          placeholder="Ex.: Goiânia, São Paulo – SP…"
          onFocus={() => { preparar(); setAberto(true) }}
          onBlur={() => setAberto(false)}
          onChange={e => {
            preparar()   // sem depender só do foco: autopreenchimento digita sem focar
            setTexto(e.target.value)
            setAtivo(0)
            setAberto(true)
            if (valor) aoEscolher(null)
          }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown' && sugestoes.length) {
              e.preventDefault()
              setAberto(true)
              setAtivo(i => (i + 1) % sugestoes.length)
            } else if (e.key === 'ArrowUp' && sugestoes.length) {
              e.preventDefault()
              setAtivo(i => (i - 1 + sugestoes.length) % sugestoes.length)
            } else if (e.key === 'Enter' && listaAberta) {
              e.preventDefault()
              escolher(sugestoes[ativo] ?? sugestoes[0])
            } else if (e.key === 'Escape') {
              setAberto(false)
            }
          }}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        {(valor || texto) && (
          <button
            type="button"
            aria-label="Limpar cidade"
            onClick={() => { aoEscolher(null); setTexto('') }}
            className="rounded-md border border-border px-2 text-foreground-secondary hover:bg-background-soft hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {listaAberta && (
        <ul
          id="vendido-cidades"
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-background-card py-1 shadow-lg"
        >
          {sugestoes.map((c, i) => (
            <li
              key={`${c.nome}-${c.uf}`}
              id={`vendido-cidade-${i}`}
              role="option"
              aria-selected={i === ativo}
              // mousedown, não click: o click chega depois do blur, e a lista já fechou.
              onMouseDown={e => { e.preventDefault(); escolher(c) }}
              onMouseEnter={() => setAtivo(i)}
              className={'cursor-pointer px-3 py-2 text-sm text-foreground ' + (i === ativo ? 'bg-background-soft' : '')}
            >
              {c.nome} <span className="text-foreground-secondary">– {c.uf}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-foreground-secondary">
        {falha
          ? `Não deu para carregar as cidades (${falha}). Tente de novo.`
          : texto && !valor && cidades && !sugestoes.length
            ? 'Nenhuma cidade com esse nome.'
            : 'O mapa traça a rota de Uberlândia até ela. Em branco, marca só Uberlândia.'}
      </p>
    </div>
  )
}

export function StoryVendidoAdmin() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [modelo, setModelo] = useState('')
  const [selo, setSelo] = useState<Selo>('VENDIDO')
  const [destino, setDestino] = useState<Cidade | null>(null)
  const [tema, setTema] = useState<TemaVendido>('claro')

  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<VeiculoEstoque[]>([])
  const [buscando, setBuscando] = useState(false)
  const [fotosDoCarro, setFotosDoCarro] = useState<string[]>([])
  const [fotoEscolhida, setFotoEscolhida] = useState<string | null>(null)
  const [nomeArquivo, setNomeArquivo] = useState('')

  const [fixos, setFixos] = useState<Fixos | null>(null)
  const [foto, setFoto] = useState<HTMLImageElement | null>(null)
  const [carregandoFoto, setCarregandoFoto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [baixando, setBaixando] = useState(false)
  /** Só a última foto pedida vale: um clique rápido em outra não pode ser atropelado pela anterior. */
  const pedido = useRef(0)

  // Fontes e imagens fixas antes do primeiro desenho: sem as fontes, o
  // measureText mede com a de sistema e o espaçamento sai errado. O contorno
  // das UFs pode falhar sem travar a peça — ela sai sem mapa.
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const [marca, bandeira, ufs] = await Promise.all([
          carregarAssets(),
          carregar('/creative/flag-br.png'),
          fetch('/creative/vendido/ufs.json')
            .then(r => (r.ok ? r.json() : null))
            .then((d: { ufs: ContornoUF[] } | null) => d?.ufs ?? null)
            .catch(() => null),
          fontesDoGerador(),
        ])
        if (vivo) setFixos({ logoPreta: marca.logoPreta, logoBranca: marca.logoBranca, bandeira, ufs })
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => { vivo = false }
  }, [])

  /**
   * Do estoque, a foto passa por fotoDoVeiculo() (/_next/image): direto do S3
   * o canvas fica tingido e o download falha. Do upload, vira object URL, que
   * é mesma origem e é revogado assim que a imagem decodifica.
   */
  const usarFoto = useCallback(async (carregarFoto: () => Promise<HTMLImageElement>, depois?: () => void) => {
    const meu = ++pedido.current
    setCarregandoFoto(true); setErro(null)
    try {
      const img = await carregarFoto()
      if (meu !== pedido.current) return
      setFoto(img)
      depois?.()
    } catch (e) {
      if (meu === pedido.current) setErro(e instanceof Error ? e.message : String(e))
    } finally {
      if (meu === pedido.current) setCarregandoFoto(false)
    }
  }, [])

  function escolherFotoDoEstoque(url: string) {
    setFotoEscolhida(url)
    void usarFoto(() => fotoDoVeiculo(url), () => setNomeArquivo(''))
  }

  function enviar(file: File) {
    const url = URL.createObjectURL(file)
    setFotoEscolhida(null)
    void usarFoto(
      () => carregar(url).finally(() => URL.revokeObjectURL(url)),
      () => setNomeArquivo(file.name),
    )
  }

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

  function escolherVeiculo(v: VeiculoEstoque) {
    const nome = [v.brand, v.model].filter(Boolean).join(' ')
    if (nome) setModelo(nome)
    setResultados([])
    const fotos = v.photos ?? []
    setFotosDoCarro(fotos)
    if (fotos[0]) escolherFotoDoEstoque(fotos[0])
    else setErro('Esse veículo não tem foto no estoque.')
  }

  // Debounce: o desenho lê e mistura imagens de 1080×1920 — a cada tecla, a
  // digitação engasgaria.
  useEffect(() => {
    if (!foto || !fixos || !canvasRef.current || !modelo.trim()) return
    const id = setTimeout(() => {
      try {
        renderStory(canvasRef.current!, { modelo, selo, destino, tema }, { foto, ...fixos })
        setErro(null)
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e))
      }
    }, 120)
    return () => clearTimeout(id)
  }, [foto, fixos, modelo, selo, destino, tema])

  async function baixar() {
    if (!canvasRef.current) return
    setBaixando(true); setErro(null)
    try {
      const blob = await exportarPng(canvasRef.current)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attra-${selo.toLowerCase()}-${slug(modelo) || 'veiculo'}-${hoje()}.png`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    } catch (e) {
      // SecurityError aqui é canvas tingido: foto que não passou pelo proxy.
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setBaixando(false)
    }
  }

  const pronto = !!foto && !!fixos && !!modelo.trim()
  const emPe = !!foto && foto.naturalHeight / foto.naturalWidth > 860 / 1080

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <link rel="stylesheet" href={FOLHA_GOOGLE} />

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
              aria-label="Buscar no estoque"
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
                    type="button" onClick={() => escolherVeiculo(v)}
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

          {fotosDoCarro.length > 0 && (
            <div className="mt-4">
              <span className="block text-xs font-medium text-foreground-secondary">
                Foto — de preferência o carro inteiro, na frente da loja e sem tarja
              </span>
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {fotosDoCarro.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    aria-pressed={fotoEscolhida === url}
                    aria-label={`Usar a foto ${i + 1}`}
                    onClick={() => escolherFotoDoEstoque(url)}
                    className={
                      'overflow-hidden rounded-md border-2 ' +
                      (fotoEscolhida === url ? 'border-primary' : 'border-transparent opacity-80 hover:opacity-100')
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- miniatura já otimizada pelo /_next/image */}
                    <img src={miniatura(url)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <span className="mt-4 block text-xs font-medium text-foreground-secondary">
            …ou envie a foto do computador
          </span>
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
                  if (f) enviar(f)
                  e.target.value = ''   // permite reenviar o MESMO arquivo
                }}
              />
            </label>
            {nomeArquivo && (
              <span className="truncate text-xs text-foreground-secondary">{nomeArquivo}</span>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-background-card p-4">
          <div>
            <label htmlFor="vendido-modelo" className="block text-xs font-medium text-foreground-secondary">
              Modelo <span className="text-primary">*</span>
            </label>
            <input
              id="vendido-modelo"
              value={modelo} onChange={e => setModelo(e.target.value)}
              placeholder="Mercedes-Benz G 63 AMG"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <Escolha
            rotulo="Situação"
            opcoes={SELOS.map(s => ({ id: s, rotulo: s.charAt(0) + s.slice(1).toLowerCase() }))}
            valor={selo}
            aoMudar={setSelo}
          />
          <CampoCidade valor={destino} aoEscolher={setDestino} />
          <div>
            <Escolha rotulo="Tema" opcoes={TEMAS} valor={tema} aoMudar={setTema} />
            <p className="mt-1 text-xs text-foreground-secondary">
              Carro escuro costuma ficar melhor no claro; carro claro, no escuro.
            </p>
          </div>
        </section>

        {emPe && (
          <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Foto em pé: a peça usa a faixa do meio e corta o resto. Foto deitada (4:3) entra inteira.</span>
          </div>
        )}
        {erro && (
          <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
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
          {carregandoFoto && pronto && (
            // A 1ª vez de cada foto do estoque passa pelo otimizador e pode levar alguns segundos.
            <div className="absolute inset-x-0 top-3 flex justify-center">
              <span className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando a foto…
              </span>
            </div>
          )}
          {!pronto && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-xs text-foreground-secondary">
              <ImageIcon className="h-6 w-6" />
              {!fixos
                ? 'Carregando fontes e imagens…'
                : !foto
                  ? 'Escolha um veículo do estoque ou envie uma foto.'
                  : 'Escreva o modelo.'}
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
