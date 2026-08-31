'use client'

/**
 * Gerador de Criativos — a tela.
 *
 * Este arquivo NÃO desenha nada. Todo o desenho vive em
 * content/admin/creative/gerador/, porte 1:1 do <script> que morava dentro de
 * content/admin/gerador-criativos.html e provado idêntico ao pixel em 35 casos
 * (scripts/regressao-gerador/). Aqui há formulário, as quatro integrações e a
 * prévia.
 *
 * As integrações, na ordem em que o operador as encontra:
 *   1. buscar no estoque   → preenche campos, galeria de fotos, link do status
 *   2. baixar              → Stories + Feed, e os dois vão ao board do Marketing
 *   3. publicar no status  → WhatsApp, 24h, sem desfazer
 *
 * Havia uma quarta: remover fundo por IA (Replicate), que alimentava o
 * Editorial e um segundo caminho do Clássico Loja. Saiu em 31/08/2026. A rota
 * /api/admin/marketing/gerador-criativos/rembg foi junto; o rembg do SITE
 * (src/lib/vehicle-hero-asset.ts, usado em /veiculos) é outro e continua.
 */

import { useCallback, useRef, useState } from 'react'
import { Download, Loader2, Search, Send } from 'lucide-react'
import {
	ALTURA_STORIES,
	carregar,
	FORMATOS,
	render,
	type FormatoId,
	type SlotFoto,
} from '@content/admin/creative/gerador'
import { FOLHA_GOOGLE } from '@content/admin/creative/gerador/fontes'
import { CampoArquivo, CampoTexto, Dica, Escolha, PainelCampos, Secao } from './campos'
import { exportarPeca } from './baixar'
import { urlFotoEstoque, useGerador } from './use-gerador'

interface VeiculoEstoque {
	id: string
	slug?: string
	brand?: string
	model?: string
	version?: string
	year_model?: string | number
	price?: number
	mileage?: number
	color?: string
	photos?: string[]
}

const fmtBR = (n: number | string) => Number(n).toLocaleString('pt-BR')

/**
 * Posições das fotos que a Ficha usa dentro da galeria do MESMO carro.
 *
 * A 1 é sempre a principal (é a capa do anúncio); 2 e 11, no padrão de
 * fotografia da Attra, costumam cair em ângulos bem diferentes — evitam dois
 * recortes quase iguais do mesmo lado do carro. São DUAS na tira de propósito:
 * com três, cada foto 4:3 ficava com 233px de altura e não dava para ler nada.
 */
const FICHA_POSICOES = [1, 2, 11]
const SLOTS_FICHA: SlotFoto[] = ['foto1', 'foto2', 'foto3']

/** Lê o arquivo do computador e devolve a imagem já decodificada e o dataURL. */
function lerArquivo(file: File): Promise<{ img: HTMLImageElement; dados: string }> {
	return new Promise((ok, erro) => {
		const r = new FileReader()
		r.onerror = () => erro(new Error('Não foi possível ler o arquivo.'))
		r.onload = e => {
			const dados = String(e.target?.result ?? '')
			carregar(dados).then(img => ok({ img, dados })).catch(erro)
		}
		r.readAsDataURL(file)
	})
}

export function CriativosAdmin() {
	const g = useGerador()
	const { estado, campo, imagens, assets, pronto, erro } = g

	const [busca, setBusca] = useState('')
	const [buscando, setBuscando] = useState(false)
	const [resultados, setResultados] = useState<VeiculoEstoque[]>([])
	const [galeria, setGaleria] = useState<string[]>([])
	const [usadas, setUsadas] = useState<Record<string, SlotFoto>>({})
	const [avisoBusca, setAvisoBusca] = useState<string | null>(null)


	const [baixando, setBaixando] = useState(false)
	const [msgDownload, setMsgDownload] = useState(
		'Gera os dois PNGs — Stories 1080×1920 e Feed 1080×1350 (4:5, só a foto principal) — baixa no computador e envia os dois ao board do Marketing.',
	)

	const [legenda, setLegenda] = useState('')
	const [link, setLink] = useState('')
	const [publicando, setPublicando] = useState(false)
	const [msgStatus, setMsgStatus] = useState('')

	const slotAtual = useRef<SlotFoto>('foto1')
	const [slotVisivel, setSlotVisivel] = useState<SlotFoto>('foto1')

	/* ------------------------------------------------ 1. busca no estoque */

	const buscarEstoque = useCallback(async () => {
		const q = busca.trim()
		setGaleria([])
		setUsadas({})
		if (!q) {
			setResultados([])
			return
		}
		setBuscando(true)
		setAvisoBusca(null)
		try {
			const r = await fetch(`/api/vehicles?search=${encodeURIComponent(q)}&limit=8`)
			const d = await r.json()
			const vs: VeiculoEstoque[] = (d.vehicles ?? []).slice(0, 8)
			setResultados(vs)
			if (!vs.length) setAvisoBusca(`Nenhum veículo encontrado para “${q}”.`)
		} catch {
			setResultados([])
			setAvisoBusca('Busca indisponível no momento.')
		} finally {
			setBuscando(false)
		}
	}, [busca])

	/**
	 * Carrega a galeria do carro nas fotos da Ficha, respeitando quantas existem.
	 * Com menos fotos que o esperado, distribui ao longo da galeria em vez de
	 * repetir as primeiras — que costumam ser variações do mesmo ângulo.
	 */
	const preSelecionarFotosDaFicha = useCallback(
		(fotos: string[]) => {
			if (!fotos.length) return
			// O terceiro detalhe começa vazio: a tira de 2 é o padrão. Limpa também
			// um carro anterior, senão a foto dele sobrava na peça do carro novo.
			imagens.current.foto4 = null
			const ultima = FICHA_POSICOES[FICHA_POSICOES.length - 1]
			const posicoes =
				fotos.length >= ultima
					? FICHA_POSICOES
					: [1, ...[1, 2].map(i => Math.min(fotos.length, 1 + Math.round((i * (fotos.length - 1)) / 2)))]
			posicoes.forEach((pos, i) => {
				const url = fotos[Math.min(pos, fotos.length) - 1]
				if (!url) return
				void carregar(urlFotoEstoque(url)).then(img => {
					g.aplicarFoto(SLOTS_FICHA[i], img)
				})
			})
		},
		[g, imagens],
	)

	/**
	 * O link do status leva UTM da ficha do carro.
	 *
	 * `utm_source=whatsapp` + `utm_medium=status` cai em "social orgânico" no
	 * painel de visitantes — bucket real, não "outros". A campanha leva o slug,
	 * então dá para ver qual veículo o status trouxe. Sem isso a visita chega
	 * como "direto" e não há como saber que veio daqui.
	 */
	function sugerirLinkDoStatus(v: VeiculoEstoque) {
		if (!v.slug) return
		const p = new URLSearchParams({
			utm_source: 'whatsapp',
			utm_medium: 'status',
			utm_campaign: v.slug,
		})
		setLink(`https://attraveiculos.com.br/veiculo/${v.slug}?${p.toString()}`)
	}

	function aplicarVeiculo(v: VeiculoEstoque) {
		campo('marca', (v.brand ?? '').toUpperCase())
		campo('modelo', [v.model, v.version].filter(Boolean).join(' ').toUpperCase())
		campo('ano', String(v.year_model ?? ''))
		campo('preco', v.price ? fmtBR(v.price) : '')
		campo('km', v.mileage ? fmtBR(v.mileage) : '')
		if (!estado.b1.trim() && v.color) campo('b1', 'Cor ' + v.color)
		sugerirLinkDoStatus(v)
		setResultados([])
		setUsadas({})
		const fotos = v.photos ?? []
		setGaleria(fotos)
		if (estado.tipo === 'ficha') preSelecionarFotosDaFicha(fotos)
	}

	/**
	 * Clique numa miniatura da galeria.
	 *
	 * Na Ficha a tira usa foto2 e foto3, e o atalho antigo (clique / Shift+clique)
	 * só alcançava as duas primeiras. Por isso ali o destino vem do seletor de
	 * slot, que avança sozinho para dar pra clicar nas três em sequência.
	 */
	function usarFotoDaGaleria(url: string, comShift: boolean) {
		const destino: SlotFoto = estado.tipo === 'ficha' ? slotAtual.current : comShift ? 'foto2' : 'foto1'
		void carregar(urlFotoEstoque(url)).then(img => {
			g.aplicarFoto(destino, img)
			setUsadas(u => {
				const novo: Record<string, SlotFoto> = {}
				for (const [k, v] of Object.entries(u)) if (v !== destino) novo[k] = v
				novo[url] = destino
				return novo
			})
			if (estado.tipo === 'ficha') {
				const i = SLOTS_FICHA.indexOf(slotAtual.current)
				slotAtual.current = SLOTS_FICHA[(i + 1) % SLOTS_FICHA.length]
				setSlotVisivel(slotAtual.current)
			}
		})
	}

	/* -------------------------------------------------- fotos do computador */

	function aoEscolherFotoDoComputador(slot: 'foto1' | 'foto2' | 'foto3' | 'foto4', file: File) {
		void lerArquivo(file)
			.then(({ img }) => g.aplicarFoto(slot, img))
			.catch(e => g.setErro(e instanceof Error ? e.message : String(e)))
	}

	function aoEscolherFotoDaLista(indice: number, file: File) {
		void lerArquivo(file)
			.then(({ img }) => {
				imagens.current.estFotos[indice] = img
				g.redesenhar()
			})
			.catch(e => g.setErro(e instanceof Error ? e.message : String(e)))
	}

	/* ---------------------------------------------------------- 2. baixar */

	async function baixar() {
		if (!g.canvasRef.current || !assets) return
		setBaixando(true)
		try {
			const r = await exportarPeca(
				g.canvasRef.current,
				estado,
				imagens.current,
				assets,
				setMsgDownload,
			)
			setMsgDownload(r.mensagem)
		} catch (e) {
			setMsgDownload(`Não foi possível exportar: ${e instanceof Error ? e.message : String(e)}`)
		} finally {
			setBaixando(false)
		}
	}

	/* ------------------------------------------- 3. publicar no status */

	async function publicarNoStatus() {
		const texto = legenda.trim()
		if (!texto) {
			setMsgStatus('Escreva a legenda antes de publicar.')
			return
		}
		// O link entra no FIM: no WhatsApp o preview é gerado pelo ÚLTIMO link da
		// mensagem, e um link no meio do texto some no meio dele.
		const textoFinal = link.trim() ? `${texto}\n\n${link.trim()}` : texto
		// Publicar é público e não tem desfazer: vai para todos os contatos da
		// instância e fica 24h no ar.
		const confirmado = window.confirm(
			`Publicar no Status do WhatsApp?\n\n${textoFinal}\n\nIsso fica 24h no ar e todos os contatos da instância veem. Não tem desfazer.`,
		)
		if (!confirmado) return

		setPublicando(true)
		setMsgStatus('Enviando a imagem — pode levar alguns segundos.')
		try {
			const canvas = g.canvasRef.current
			if (!canvas || !assets) throw new Error('A prévia ainda não está pronta.')
			// Redesenha antes de ler: a prévia é pintada num requestAnimationFrame,
			// que não roda com a aba oculta. Sem isto, publicar de uma aba que
			// acabou de voltar à frente mandaria a peça ANTERIOR ao ar — e status
			// publicado não tem desfazer.
			render(canvas.getContext('2d')!, estado, imagens.current, assets, ALTURA_STORIES)
			const imagem = canvas.toDataURL('image/jpeg', 0.88)
			const r = await fetch('/api/admin/marketing/gerador-criativos/publicar-status', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ image: imagem, caption: textoFinal }),
			})
			const d = await r.json().catch(() => null)
			if (!r.ok || !d?.ok) {
				setMsgStatus(`Não publicou: ${d?.error || d?.detalhe || `HTTP ${r.status}`}`)
			} else {
				const hora = d.timestamp ? new Date(d.timestamp).toLocaleTimeString('pt-BR') : ''
				setMsgStatus(`Publicado${hora ? ` às ${hora}` : ''}. Fica 24h no ar.`)
			}
		} catch (e) {
			setMsgStatus(`Falhou ao publicar: ${e instanceof Error ? e.message : String(e)}`)
		} finally {
			setPublicando(false)
		}
	}

	/* ------------------------------------------------------------ a tela */

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
			{/* O React 19 iça este link para o <head>. É a MESMA folha que o HTML
			    antigo usava: o canvas pede a família "Montserrat" literal, que o
			    next/font do layout não publica. Ver content/…/gerador/fontes.ts. */}
			<link rel="stylesheet" href={FOLHA_GOOGLE} />

			<div className="space-y-5">
				<Secao titulo="Tipo de criativo">
					<Escolha<FormatoId>
						opcoes={FORMATOS}
						valor={estado.tipo}
						aoEscolher={g.trocarFormato}
					/>
				</Secao>

				{estado.tipo !== 'estoque' && (
					<Secao titulo="Buscar do estoque (opcional)">
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
								placeholder="Ex.: Porsche 911, GLC 300, Purosangue…"
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

						{avisoBusca && <Dica>{avisoBusca}</Dica>}

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
											{v.price ? ` — R$ ${fmtBR(v.price)}` : ''}
											{v.mileage ? ` · ${fmtBR(v.mileage)} km` : ''}
										</button>
									</li>
								))}
							</ul>
						)}

						{estado.tipo === 'ficha' && galeria.length > 0 && (
							<div>
								<span className="mb-1 block text-xs font-medium text-foreground-secondary">
									Clicar numa foto abaixo aplica em:
								</span>
								<Escolha<SlotFoto>
									opcoes={[
										{ id: 'foto1', nome: 'Principal', descricao: 'foto grande' },
										{ id: 'foto2', nome: 'Detalhe 1', descricao: 'tira, esquerda' },
										{ id: 'foto3', nome: 'Detalhe 2', descricao: 'tira, direita' },
									]}
									valor={slotVisivel}
									aoEscolher={s => {
										slotAtual.current = s
										setSlotVisivel(s)
									}}
								/>
								<Dica>
									O destino avança sozinho a cada foto escolhida, então dá para clicar nas três
									em sequência.
								</Dica>
							</div>
						)}

						{galeria.length > 0 && (
							<div className="flex flex-wrap gap-2">
								{galeria.map(u => (
									<button
										key={u}
										type="button"
										onClick={e => usarFotoDaGaleria(u, e.shiftKey)}
										title={
											usadas[u]
												? `Aplicada em: ${usadas[u] === 'foto1' ? 'Principal' : usadas[u]}`
												: estado.tipo === 'ficha'
													? 'Clique: aplica no destino selecionado acima'
													: 'Clique: Foto principal · Shift+clique: Foto 2'
										}
										className={
											'overflow-hidden rounded-md border-2 transition-colors ' +
											(usadas[u] ? 'border-primary' : 'border-transparent hover:border-border')
										}
									>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={`/_next/image?url=${encodeURIComponent(u)}&w=256&q=60`}
											alt=""
											className="h-16 w-20 object-cover"
										/>
									</button>
								))}
							</div>
						)}

						<Dica>
							Selecionar um veículo preenche os campos abaixo (tudo continua editável na mão).
							Clique numa foto para usá-la como <strong>Foto principal</strong>; com Shift, vira a{' '}
							<strong>Foto 2</strong>.
						</Dica>
					</Secao>
				)}

				<PainelCampos
					g={g}
					aoEscolherFotoDoComputador={aoEscolherFotoDoComputador}
					aoEscolherFotoDaLista={aoEscolherFotoDaLista}
				/>

				<Secao titulo="Logo (opcional)">
					<CampoArquivo
						rotulo="PNG transparente"
						aceita="image/png"
						aoEscolher={f =>
							void lerArquivo(f)
								.then(({ img, dados }) => g.definirLogo(img, dados))
								.catch(e => g.setErro(e instanceof Error ? e.message : String(e)))
						}
					/>
					<Dica>
						As logos oficiais da Attra (branca e preta) já vêm embutidas e são usadas conforme o
						fundo de cada formato. Envie um PNG transparente aqui apenas se quiser substituir a do
						formato Clássico.
					</Dica>
					<button
						type="button"
						onClick={() => g.definirLogo(null)}
						className="rounded-md border border-border px-3 py-2 text-xs text-foreground-secondary hover:bg-background-soft"
					>
						Voltar ao logo padrão
					</button>
				</Secao>

				<Secao titulo="Publicar no Status do WhatsApp">
					<label className="block">
						<span className="mb-1 block text-xs font-medium text-foreground-secondary">Legenda</span>
						<textarea
							rows={5}
							value={legenda}
							onChange={e => setLegenda(e.target.value)}
							placeholder="Escreva a legenda do status…"
							className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
						/>
					</label>
					<CampoTexto
						rotulo="Link (entra no fim da legenda)"
						valor={link}
						aoMudar={setLink}
						placeholder="https://attraveiculos.com.br/veiculo/…"
					/>
					<Dica>
						Selecionar um veículo na busca preenche o link com a ficha dele, já marcada para o
						painel saber que a visita veio do status. Dá para editar.
					</Dica>
					<button
						type="button"
						onClick={() => void publicarNoStatus()}
						disabled={publicando || !pronto}
						className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
					>
						{publicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
						Publicar no status (24h)
					</button>
					{msgStatus && <Dica>{msgStatus}</Dica>}
				</Secao>
			</div>

			{/* ---------- prévia ---------- */}
			<div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
				<div
					className="overflow-hidden rounded-xl border border-border bg-black shadow-2xl"
					style={{ aspectRatio: '9 / 16' }}
				>
					<canvas
						ref={g.canvasRef}
						width={1080}
						height={1920}
						className="block h-full w-full"
					/>
				</div>
				<p className="text-center text-[11px] uppercase tracking-wider text-foreground-secondary">
					{pronto ? 'Prévia em tempo real — exporta Stories 1080×1920 + Feed 1080×1350' : 'Carregando fontes e imagens…'}
				</p>

				<button
					type="button"
					onClick={() => void baixar()}
					disabled={!pronto || baixando}
					className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
				>
					{baixando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
					Baixar Stories + Feed (envia ao Marketing)
				</button>
				<Dica>{msgDownload}</Dica>

				{erro && (
					<div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
						{erro}
					</div>
				)}
			</div>
		</div>
	)
}
