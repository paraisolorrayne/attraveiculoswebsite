'use client'

/**
 * Dossiê técnico — a tela.
 *
 * O documento em si vive em content/admin/creative/dossie/documento.ts, que
 * devolve um HTML autocontido. Aqui há o formulário, a prévia num iframe e o
 * botão que abre a versão de impressão.
 *
 * O QUE O ESTOQUE PREENCHE E O QUE NÃO. Marca, modelo, ano, km, cor e as fotos
 * vêm da API. A ficha técnica não vem: `engine`, `horsepower`, `torque`,
 * `acceleration`, `top_speed` e `options` chegam nulos. Esses campos são
 * digitados — decisão da Lorrayne (01/09/2026), preferindo o trabalho manual ao
 * risco de uma IA inventar um número de torque num documento que vai para o
 * cliente.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Loader2, Printer, Search } from 'lucide-react'
import {
	DOSSIE_INICIAL,
	FOTOS_FIXAS,
	FOTOS_POR_PAGINA_GALERIA,
	type Dossie,
	type LinhaFicha,
} from '@content/admin/creative/dossie/tipos'
import { montarDossie } from '@content/admin/creative/dossie/documento'
import { ESTILOS_DE_CAPA } from '@content/admin/creative/dossie/capas'
import {
	comFotoNoSlot,
	fotoDoSlot,
	slotsDoDossie,
	type SlotDeFoto,
} from '@content/admin/creative/dossie/slots'
import { CampoTexto, Dica, Secao } from '../criativos/campos'
import { urlFotoEstoque } from '../criativos/use-gerador'

interface VeiculoEstoque {
	id: string
	brand?: string
	model?: string
	version?: string
	year_model?: string | number
	mileage?: number
	color?: string
	transmission?: string
	body_type?: string
	doors?: number
	description?: string
	photos?: string[]
}

const fmtBR = (n: number | string) => Number(n).toLocaleString('pt-BR')

/** 210 x 297mm em pixels de CSS — uma folha A4 a 96dpi. */
const LARGURA_A4 = (210 / 25.4) * 96
const ALTURA_A4 = (297 / 25.4) * 96
/** A folha mais a respiração que a prévia desenha em volta dela (4mm + 4mm). */
const ALTURA_NA_PREVIA = ALTURA_A4 + (8 / 25.4) * 96

export function DossieAdmin({ visivel }: { visivel: boolean }) {
	const [d, setD] = useState<Dossie>(() => structuredClone(DOSSIE_INICIAL))
	const [busca, setBusca] = useState('')
	const [buscando, setBuscando] = useState(false)
	const [resultados, setResultados] = useState<VeiculoEstoque[]>([])
	const [aviso, setAviso] = useState<string | null>(null)

	const campo = useCallback(
		<K extends keyof Dossie>(chave: K, valor: Dossie[K]) => setD(x => ({ ...x, [chave]: valor })),
		[],
	)

	const linha = useCallback(
		(grupo: 'performance' | 'dimensoes' | 'suspensao', i: number, valor: string) =>
			setD(x => ({ ...x, [grupo]: x[grupo].map((l, j) => (j === i ? { ...l, valor } : l)) })),
		[],
	)

	const item = useCallback(
		(g: number, i: number, valor: string) =>
			setD(x => ({
				...x,
				diferenciais: x.diferenciais.map((grupo, gj) =>
					gj === g ? { ...grupo, itens: grupo.itens.map((it, ij) => (ij === i ? valor : it)) } : grupo,
				),
			})),
		[],
	)

	async function buscarEstoque() {
		const q = busca.trim()
		if (!q) return
		setBuscando(true)
		setAviso(null)
		try {
			const r = await fetch(`/api/vehicles?search=${encodeURIComponent(q)}&limit=8`)
			const j = await r.json()
			const vs: VeiculoEstoque[] = (j.vehicles ?? []).slice(0, 8)
			setResultados(vs)
			if (!vs.length) setAviso(`Nenhum veículo encontrado para “${q}”.`)
		} catch {
			setAviso('Busca indisponível no momento.')
		} finally {
			setBuscando(false)
		}
	}

	/**
	 * Traz do estoque só o que ele realmente tem, e deixa o resto em branco.
	 *
	 * Nada de derivar motorização da `version` ou cor da `color`: no Aston o
	 * estoque diz "Cupê V8 510cv" e "Verde", enquanto o dossiê pede "4.0 V8
	 * Bi-Turbo · 680cv" e "Podium Green". Preencher com o que está no cadastro
	 * daria um documento que PARECE conferido e não foi.
	 */
	function aplicarVeiculo(v: VeiculoEstoque) {
		const km = v.mileage != null ? `${fmtBR(v.mileage)} km` : ''
		setD(x => ({
			...x,
			marca: (v.brand ?? '').toUpperCase(),
			modelo: [v.model, v.version].filter(Boolean).join(' ').toUpperCase(),
			ano: String(v.year_model ?? ''),
			km,
			anoModelo: String(v.year_model ?? ''),
			quilometragem: km,
			tracao: x.tracao,
			suspensao: x.suspensao.map(l =>
				l.rotulo === 'PORTAS' && v.doors ? { ...l, valor: `${v.doors} Portas${v.body_type ? ` · ${v.body_type}` : ''}` } : l,
			),
			performance: x.performance.map(l =>
				l.rotulo === 'TRANSMISSÃO' && v.transmission ? { ...l, valor: v.transmission } : l,
			),
			// A galeria guarda TODAS as fotos do veículo; `fotos` fica com a
			// distribuição inicial pelos slots, na ordem que a API devolveu. É essa
			// separação que permite trocar um slot sem perder as outras opções.
			galeria: (v.photos ?? []).map(urlFotoEstoque),
			fotos: (v.photos ?? []).map(urlFotoEstoque),
			fotoFinal: '',
		}))
		setResultados([])
		setAviso(
			'Trouxe o que o estoque tem. A ficha técnica não vem dele — motor, torque, dimensões e freios ficam com você.',
		)
	}

	/**
	 * Qual slot recebe a próxima foto clicada na galeria.
	 *
	 * Mesma mecânica da aba Criativos: escolhe-se o destino e clica-se na foto.
	 * Aqui o destino avança sozinho depois de cada escolha, porque o dossiê tem
	 * uma dúzia de slots e trocar um por um seria dois cliques cada.
	 */
	const [slotEmFoco, setSlotEmFoco] = useState(0)
	const slots = useMemo(() => slotsDoDossie(d), [d])

	const aplicarNoSlot = useCallback(
		(slot: SlotDeFoto, url: string) => setD(x => comFotoNoSlot(x, slot, url)),
		[],
	)

	const usarDaGaleria = useCallback(
		(url: string) => {
			const slot = slots[slotEmFoco]
			if (!slot) return
			aplicarNoSlot(slot, url)
			setSlotEmFoco(i => (i + 1) % slots.length)
		},
		[slots, slotEmFoco, aplicarNoSlot],
	)

	/**
	 * A prévia mostra a folha INTEIRA, não um pedaço dela com barra de rolagem.
	 *
	 * O iframe é montado no tamanho real de uma folha (794 x 1123px = A4 a 96dpi)
	 * e encolhido por `transform`. A escala cabe nas DUAS medidas da moldura: só
	 * pela largura a página ficaria alta demais e o operador teria de rolar para
	 * ver o pé de cada página, que é a mesma queixa da barra lateral virada de
	 * lado. Medir por dentro do iframe não funciona — ele nasce num `div hidden`
	 * e reporta zero; quem manda no tamanho é a coluna, e é ela que observamos.
	 */
	const molduraRef = useRef<HTMLDivElement>(null)
	const [escala, setEscala] = useState(0.5)
	useEffect(() => {
		const el = molduraRef.current
		if (!el) return
		let vivo = true
		const medir = () => {
			const l = el.clientWidth
			const a = el.clientHeight
			if (l > 50 && a > 50) {
				setEscala(Math.min(l / LARGURA_A4, a / ALTURA_NA_PREVIA))
				return true
			}
			return false
		}
		// A aba fica MONTADA e escondida com `hidden` (ver a casca do gerador), e
		// enquanto estiver assim a coluna mede zero. O ResizeObserver não avisa
		// nessa transição, então a escala ficava presa no palpite inicial: quem
		// avisa é o `visivel` que vem de cima. As tentativas por quadro cobrem o
		// intervalo até o layout assentar depois que a aba aparece.
		let tentativas = 0
		const tentar = () => {
			if (!vivo || medir() || tentativas++ > 60) return
			requestAnimationFrame(tentar)
		}
		tentar()
		const obs = new ResizeObserver(medir)
		obs.observe(el)
		return () => {
			vivo = false
			obs.disconnect()
		}
	}, [visivel])

	// Duas versões do mesmo documento: a da prévia encolhe para caber na coluna
	// (senão o operador rola de lado para ver metade da página), e a que vai para
	// a impressão sai em A4 de verdade.
	const htmlPrevia = useMemo(() => montarDossie(d, { ajustarNaLargura: true }), [d])
	const htmlImpressao = useMemo(() => montarDossie(d), [d])

	const fotosDeGaleria = Math.max(0, d.fotos.length - FOTOS_FIXAS - 3)
	const paginasReais =
		5 + Math.min(d.paginasDeGaleria, Math.ceil(fotosDeGaleria / FOTOS_POR_PAGINA_GALERIA)) + 1

	function abrirParaImprimir() {
		const j = window.open('', '_blank')
		if (!j) {
			setAviso('O navegador bloqueou a janela. Libere os pop-ups deste site e tente de novo.')
			return
		}
		j.document.write(htmlImpressao)
		j.document.close()
	}

	const tabela = (rotulo: string, grupo: 'performance' | 'dimensoes' | 'suspensao') => (
		<Secao titulo={rotulo}>
			{d[grupo].map((l: LinhaFicha, i: number) => (
				<CampoTexto key={l.rotulo} rotulo={l.rotulo} valor={l.valor} aoMudar={v => linha(grupo, i, v)} />
			))}
		</Secao>
	)

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
			<div className="space-y-5">
				<Secao titulo="Veículo do estoque">
					<div className="flex gap-2">
						<input
							value={busca}
							onChange={e => setBusca(e.target.value)}
							onKeyDown={e => {
								if (e.key === 'Enter') {
									e.preventDefault()
									void buscarEstoque()
								}
							}}
							placeholder="Ex.: Aston Martin, Vantage, 911…"
							className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
						/>
						<button
							type="button"
							onClick={() => void buscarEstoque()}
							disabled={buscando}
							className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
						>
							{buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
							Buscar
						</button>
					</div>
					{resultados.length > 0 && (
						<ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
							{resultados.map(v => (
								<li key={v.id}>
									<button
										type="button"
										onClick={() => aplicarVeiculo(v)}
										className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-background-soft"
									>
										{[v.brand, v.model, v.version, v.year_model].filter(Boolean).join(' ')}
										<span className="ml-2 text-xs text-foreground-secondary">
											{v.photos?.length ?? 0} fotos
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
					{aviso && <Dica>{aviso}</Dica>}
				</Secao>

				<Secao titulo="Capa e identificação">
					<div className="grid grid-cols-3 gap-2">
						{ESTILOS_DE_CAPA.map(e => (
							<button
								key={e.id}
								type="button"
								onClick={() => campo('estiloCapa', e.id)}
								aria-pressed={d.estiloCapa === e.id}
								className={
									'rounded-md border px-3 py-2 text-left transition-colors ' +
									(d.estiloCapa === e.id
										? 'border-primary bg-primary/10'
										: 'border-border hover:border-foreground-secondary')
								}
							>
								<span className="block text-sm font-medium text-foreground">{e.rotulo}</span>
								<span className="block text-xs text-foreground-secondary">{e.resumo}</span>
							</button>
						))}
					</div>
					<div className="grid grid-cols-2 gap-3">
						<CampoTexto rotulo="Marca" valor={d.marca} aoMudar={v => campo('marca', v)} />
						<CampoTexto rotulo="Modelo" valor={d.modelo} aoMudar={v => campo('modelo', v)} />
					</div>
					<CampoTexto
						rotulo="Assinatura (linha fina sob o nome)"
						valor={d.assinatura}
						aoMudar={v => campo('assinatura', v)}
						placeholder="V8 BI-TURBO · 680CV"
					/>
					<div className="grid grid-cols-3 gap-3">
						<CampoTexto rotulo="Ano" valor={d.ano} aoMudar={v => campo('ano', v)} />
						<CampoTexto rotulo="Cor" valor={d.cor} aoMudar={v => campo('cor', v)} placeholder="PODIUM GREEN" />
						<CampoTexto rotulo="KM" valor={d.km} aoMudar={v => campo('km', v)} placeholder="460 KM" />
					</div>
				</Secao>

				<Secao titulo="Visão geral">
					<div className="grid grid-cols-2 gap-3">
						<CampoTexto rotulo="Ano / Modelo" valor={d.anoModelo} aoMudar={v => campo('anoModelo', v)} />
						<CampoTexto
							rotulo="Quilometragem"
							valor={d.quilometragem}
							aoMudar={v => campo('quilometragem', v)}
							placeholder="460 km (seminovo)"
						/>
						<CampoTexto rotulo="Cor externa" valor={d.corExterna} aoMudar={v => campo('corExterna', v)} />
						<CampoTexto rotulo="Interior" valor={d.interior} aoMudar={v => campo('interior', v)} />
						<CampoTexto
							rotulo="Motorização"
							valor={d.motorizacao}
							aoMudar={v => campo('motorizacao', v)}
							placeholder="4.0 V8 Bi-Turbo · 680cv"
						/>
						<CampoTexto rotulo="Tração" valor={d.tracao} aoMudar={v => campo('tracao', v)} />
					</div>
					<CampoTexto
						rotulo="Documentação — título"
						valor={d.documentacaoTitulo}
						aoMudar={v => campo('documentacaoTitulo', v)}
						placeholder="IPVA 2026 integralmente pago"
					/>
					<CampoTexto
						rotulo="Documentação — detalhe"
						valor={d.documentacaoDetalhe}
						aoMudar={v => campo('documentacaoDetalhe', v)}
						placeholder="Unidade seminova · 460 km rodados · Pronta para transferência"
					/>
					<label className="block">
						<span className="mb-1 block text-xs font-medium text-foreground-secondary">
							Parágrafo de fecho
						</span>
						<textarea
							rows={3}
							value={d.resumo}
							onChange={e => campo('resumo', e.target.value)}
							className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
						/>
					</label>
				</Secao>

				{tabela('Ficha técnica — motorização e performance', 'performance')}
				<Secao titulo="Nota sob a tabela de performance">
					<CampoTexto rotulo="Nota (itálico, opcional)" valor={d.notaPerformance} aoMudar={v => campo('notaPerformance', v)} />
				</Secao>
				{tabela('Ficha técnica — dimensões e peso', 'dimensoes')}
				{tabela('Ficha técnica — suspensão e tecnologia', 'suspensao')}

				<Secao titulo="Diferenciais desta unidade">
					<label className="block">
						<span className="mb-1 block text-xs font-medium text-foreground-secondary">Introdução</span>
						<textarea
							rows={2}
							value={d.introDiferenciais}
							onChange={e => campo('introDiferenciais', e.target.value)}
							className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
						/>
					</label>
					{d.diferenciais.map((g, gi) => (
						<div key={g.titulo} className="rounded-md border border-border p-3">
							<h4 className="mb-2 text-xs font-semibold text-foreground">{g.titulo}</h4>
							{g.itens.map((it, ii) => (
								<CampoTexto
									key={ii}
									rotulo={`Item ${ii + 1}`}
									valor={it}
									aoMudar={v => item(gi, ii, v)}
									placeholder="Use **asteriscos** para destacar"
								/>
							))}
						</div>
					))}
					<Dica>
						O que estiver entre <strong>**asteriscos**</strong> sai em negrito, como no dossiê original
						(“<strong>Pintura Exclusiva</strong> Podium Green”).
					</Dica>
				</Secao>

				<Secao titulo="Fotos">
					<CampoTexto
						rotulo="Páginas de galeria (2 fotos cada)"
						valor={String(d.paginasDeGaleria)}
						aoMudar={v => campo('paginasDeGaleria', Math.max(0, Math.min(20, Number(v) || 0)))}
						inputMode="numeric"
					/>

					<div>
						<span className="mb-2 block text-xs font-medium text-foreground-secondary">
							Onde cada foto entra — clique para escolher o destino
						</span>
						<div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
							{slots.map((slot, i) => {
								const url = fotoDoSlot(d, slot)
								const ativo = i === slotEmFoco
								return (
									<button
										key={`${slot.indice}`}
										type="button"
										onClick={() => setSlotEmFoco(i)}
										aria-pressed={ativo}
										title={`${slot.rotulo} · ${slot.pagina}`}
										className={
											'overflow-hidden rounded-md border-2 text-left transition-colors ' +
											(ativo ? 'border-primary' : 'border-border hover:border-foreground-secondary')
										}
									>
										<span className="block h-16 w-full bg-background">
											{url ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img src={url} alt="" className="h-16 w-full object-cover" />
											) : (
												<span className="flex h-16 w-full items-center justify-center text-[10px] text-foreground-secondary">
													vazio
												</span>
											)}
										</span>
										<span className="block px-1.5 py-1">
											<span className="block truncate text-[11px] font-medium text-foreground">
												{slot.rotulo}
											</span>
											<span className="block truncate text-[10px] text-foreground-secondary">
												{slot.pagina}
											</span>
										</span>
									</button>
								)
							})}
						</div>
					</div>

					{d.galeria.length > 0 ? (
						<div>
							<span className="mb-2 block text-xs font-medium text-foreground-secondary">
								Fotos do veículo ({d.galeria.length}) — clique para aplicar em{' '}
								<strong className="text-foreground">{slots[slotEmFoco]?.rotulo}</strong>
							</span>
							<div className="flex flex-wrap gap-2">
								{d.galeria.map(u => {
									const emUso = slots.find(sl => fotoDoSlot(d, sl) === u)
									return (
										<button
											key={u}
											type="button"
											onClick={() => usarDaGaleria(u)}
											title={emUso ? `Em uso: ${emUso.rotulo}` : 'Clique para aplicar no destino'}
											className={
												'overflow-hidden rounded-md border-2 transition-colors ' +
												(emUso ? 'border-primary' : 'border-transparent hover:border-border')
											}
										>
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img src={u} alt="" className="h-14 w-20 object-cover" />
										</button>
									)
								})}
							</div>
						</div>
					) : (
						<Dica>Busque um veículo no estoque para trazer as fotos.</Dica>
					)}

					<Dica>
						O destino avança sozinho a cada foto escolhida, então dá para percorrer os slots em
						sequência. Hoje há material para{' '}
						<strong>{Math.ceil(fotosDeGaleria / FOTOS_POR_PAGINA_GALERIA)} páginas</strong> de galeria.
					</Dica>
				</Secao>

				<Secao titulo="Contracapa">
					<label className="block">
						<span className="mb-1 block text-xs font-medium text-foreground-secondary">
							Chamada da contracapa
						</span>
						<textarea
							rows={3}
							value={d.chamada}
							onChange={e => campo('chamada', e.target.value)}
							className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
						/>
					</label>
				</Secao>
			</div>

			{/* ---------- prévia ---------- */}
			<div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
				<div className="flex items-center justify-between text-xs text-foreground-secondary">
					<span className="flex items-center gap-1.5">
						<FileText className="h-3.5 w-3.5" />
						{paginasReais} páginas
					</span>
					<span>A4 · 210 × 297 mm</span>
				</div>
				<div
					ref={molduraRef}
					className="flex justify-center overflow-hidden rounded-lg border border-border bg-[#3a3a3f]"
					style={{ height: '78vh' }}
				>
					{/* O `transform` encolhe o desenho e não a caixa: sem este invólucro
					    com a largura já reduzida, a moldura continua sendo empurrada
					    pelos 794px do iframe. */}
					<div style={{ width: LARGURA_A4 * escala, height: '100%', overflow: 'hidden' }}>
						<iframe
							title="Prévia do dossiê"
							srcDoc={htmlPrevia}
							style={{
								width: LARGURA_A4,
								height: `${100 / escala}%`,
								transform: `scale(${escala})`,
								transformOrigin: 'top left',
								border: 0,
								display: 'block',
							}}
						/>
					</div>
				</div>
				<button
					type="button"
					onClick={abrirParaImprimir}
					className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-white"
				>
					<Printer className="h-4 w-4" />
					Abrir para imprimir / salvar em PDF
				</button>
				<Dica>
					Abre o dossiê numa aba própria. Use <strong>Cmd+P → Salvar como PDF</strong>, com margens em
					“nenhuma” e “imprimir gráficos de fundo” ligado. O texto sai vetorial: dá para selecionar e
					buscar, e o arquivo fica em poucos megabytes em vez de dezenas.
				</Dica>
			</div>
		</div>
	)
}
