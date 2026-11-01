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

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock3, Download, Loader2, Pencil, Search, Send, Trash2 } from 'lucide-react'
import {
	ALTURA_STORIES,
	carregar,
	ESTADO_INICIAL,
	FORMATOS,
	render,
	type FormatoId,
	type SlotFoto,
} from '@content/admin/creative/gerador'
import { corSugeridaPeloNome } from '@content/admin/creative/gerador/formatos/premium'
import { FOLHA_GOOGLE } from '@content/admin/creative/gerador/fontes'
import { CampoArquivo, CampoTexto, Dica, Escolha, PainelCampos, Secao } from './campos'
import { buscarFicha, destaquesDa, motorComPotencia, numeroDa, semParenteses } from '../ficha-autoconf'
import { exportarPeca, nomeDaPeca } from './baixar'
import {
	guardar,
	listar,
	miniaturaDe,
	remover,
	type CriativoGuardado,
} from '@content/admin/creative/gerador/historico'
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
	/** Potência em cv, quando o Autoconf traz. */
	horsepower?: number | null
}

const fmtBR = (n: number | string) => Number(n).toLocaleString('pt-BR')

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

	const [historico, setHistorico] = useState<CriativoGuardado[]>([])
	const [miniaturas, setMiniaturas] = useState<Record<string, string>>({})

	/* --------------------------------------- histórico das últimas 24h */

	// As miniaturas viram object URLs, que precisam ser revogados — senão cada
	// recarga da lista vaza um blob por card. O controle fica num ref, e NÃO
	// dentro do updater de estado: o React chama updaters duas vezes em
	// StrictMode, e revogar ali derrubaria as URLs que a segunda chamada acabou
	// de criar, deixando os cards sem imagem em desenvolvimento.
	const urlsDasMiniaturas = useRef<string[]>([])

	const recarregarHistorico = useCallback(async () => {
		const itens = await listar()
		for (const u of urlsDasMiniaturas.current) URL.revokeObjectURL(u)
		const novas = Object.fromEntries(itens.map(i => [i.id, URL.createObjectURL(i.miniatura)]))
		urlsDasMiniaturas.current = Object.values(novas)
		setHistorico(itens)
		setMiniaturas(novas)
	}, [])

	useEffect(() => {
		void recarregarHistorico()
		return () => {
			for (const u of urlsDasMiniaturas.current) URL.revokeObjectURL(u)
			urlsDasMiniaturas.current = []
		}
	}, [recarregarHistorico])

	async function editar(c: CriativoGuardado) {
		await g.restaurar(c)
		setMsgDownload(`Editando "${c.nome}", gerado às ${new Date(c.quando).toLocaleTimeString('pt-BR')}.`)
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	async function descartar(id: string) {
		await remover(id)
		await recarregarHistorico()
	}

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

	/**
	 * O que o preenchimento automático escreveu da última vez, por campo. Trocar
	 * de carro só mexe num campo que ainda é o exemplo, está vazio ou continua
	 * igual ao que a busca anterior pôs: o que o operador digitou não some.
	 */
	const preenchido = useRef<Record<string, string>>({})
	/** Só o último clique vale, se a ficha de um carro chegar depois da do outro. */
	const pedido = useRef(0)

	async function aplicarVeiculo(v: VeiculoEstoque) {
		const meu = ++pedido.current
		setResultados([])
		setAvisoBusca('Buscando a ficha do carro na AutoConf…')
		// A lista da busca não traz a ficha que o marketing escreve na AutoConf
		// (motor, torque, 0-100, cor, interior, diferenciais): ela vem com o carro
		// aberto pelo id. Sem ficha, segue só com o cadastro, como antes.
		const f = await buscarFicha(v.id)
		if (meu !== pedido.current) return

		const premium = estado.tipo === 'premium'
		const edicao = estado.tipo === 'edicao'
		const livre = <T,>(chave: string, atual: T, exemplo: T, vazio: boolean) => {
			const j = JSON.stringify(atual)
			return vazio || j === JSON.stringify(exemplo) || j === preenchido.current[chave]
		}
		const preencher = <K extends keyof typeof estado>(chave: K, valor: (typeof estado)[K]) => {
			preenchido.current[chave] = JSON.stringify(valor)
			campo(chave, valor)
		}

		const cor = f?.cor || v.color || ''
		const destaques = f ? destaquesDa(f) : []
		campo('marca', (v.brand ?? '').toUpperCase())
		// No Premium e na Edição o modelo vira o título grande, e a versão ("V8
		// Bi-Turbo") o deixaria comprido demais — ela cabe melhor na ficha.
		campo('modelo', (premium || edicao ? [v.model] : [v.model, v.version]).filter(Boolean).join(' ').toUpperCase())
		campo('ano', String(v.year_model ?? ''))
		campo('preco', v.price ? fmtBR(v.price) : '')
		// 0 km é dado, não ausência: no Premium vira o "0KM" da linha sob a faixa.
		campo('km', v.mileage ? fmtBR(v.mileage) : (premium || edicao) && v.mileage === 0 ? '0' : '')

		// As três linhas de destaque (Clássico Loja e Edição) andam juntas.
		const bs = [estado.b1, estado.b2, estado.b3]
		const exemploBs = [ESTADO_INICIAL.b1, ESTADO_INICIAL.b2, ESTADO_INICIAL.b3]
		const bsLivres = livre('bs', bs, exemploBs, !bs.some(b => b.trim()))
		const porNasLinhas = (novas: string[]) => {
			preenchido.current.bs = JSON.stringify(novas)
			campo('b1', novas[0])
			campo('b2', novas[1])
			campo('b3', novas[2])
		}
		if (edicao) {
			// Na Edição os três destaques são a ficha, e a primeira linha sai em
			// destaque: é o lugar da versão (motor).
			if (bsLivres)
				porNasLinhas([
					(f && motorComPotencia(f)) || v.version || '',
					cor ? 'Cor ' + cor : '',
					f?.interior ? 'Interior ' + f.interior : (destaques[0] ?? ''),
				])
		} else if (f && bsLivres) {
			// Clássico Loja com ficha: cor, motor e o primeiro destaque, como no exemplo
			// ("Motor 2.0 turbo gasolina 285 cv / 61,2 kgfm").
			const numeros = [f.potencia, f.torque].filter(Boolean).join(' / ')
			porNasLinhas([
				cor ? 'Cor ' + cor : '',
				f.motor || numeros ? ['Motor', f.motor && semParenteses(f.motor), numeros].filter(Boolean).join(' ') : '',
				destaques[0] ?? '',
			])
		} else if (!estado.b1.trim() && cor) campo('b1', 'Cor ' + cor)

		if (cor) {
			// Na faixa do Premium, só o nome da cor: "Viola Pasifae com Detalhes em
			// Giallo" vira "VIOLA PASIFAE". A sugestão de tom tenta o nome de catálogo
			// e cai para a cor genérica do cadastro ("Roxo"), que é a que ela conhece.
			campo('nomeCor', cor.split(/\s+com\s+/i)[0].toUpperCase())
			campo('corDestaque', corSugeridaPeloNome(f?.cor ?? '') || corSugeridaPeloNome(v.color ?? ''))
		}
		if (livre('desempenho', estado.desempenho, ESTADO_INICIAL.desempenho, !estado.desempenho.some(d => d.valor.trim()))) {
			preencher('desempenho', [
				{ valor: numeroDa(f?.potencia) || (v.horsepower ? String(v.horsepower) : ''), unidade: 'cv', rotulo: 'POTÊNCIA' },
				{ valor: numeroDa(f?.torque), unidade: 'kgfm', rotulo: 'TORQUE' },
				{ valor: numeroDa(f?.aceleracao_0_100), unidade: 's', rotulo: '0-100 KM/H' },
				f?.velocidade_maxima
					? { valor: numeroDa(f.velocidade_maxima), unidade: 'km/h', rotulo: 'VEL. MÁXIMA' }
					: { valor: '', unidade: '', rotulo: '' },
			])
		}
		if (livre('blocos', estado.blocos, ESTADO_INICIAL.blocos, !estado.blocos.some(b => b.texto.trim()))) {
			preencher('blocos', [
				{ rotulo: 'MOTOR', texto: f?.motor ? semParenteses(f.motor) : (v.version ?? '') },
				{ rotulo: 'COR', texto: cor },
				{ rotulo: 'TRAÇÃO', texto: f?.tracao ?? '' },
				{ rotulo: 'INTERIOR', texto: f?.interior ?? '' },
				// Até três linhas, uma por destaque: é o que o bloco desenha.
				{ rotulo: 'DESTAQUES', texto: destaques.slice(0, 3).join('\n') },
			])
		}
		sugerirLinkDoStatus(v)
		setUsadas({})
		const fotos = v.photos ?? []
		setGaleria(fotos)
		setAvisoBusca(
			f
				? 'Usei a ficha da AutoConf (motor, potência, torque, cor, interior e destaques). Confira antes de baixar.'
				: 'Este carro ainda não tem a ficha na AutoConf: veio só o que o cadastro tem.',
		)
	}

	/** Clique numa miniatura da galeria: foto principal, ou a de baixo com Shift. */
	function usarFotoDaGaleria(url: string, comShift: boolean) {
		const destino: SlotFoto = comShift ? 'foto2' : 'foto1'
		void carregar(urlFotoEstoque(url)).then(img => {
			g.aplicarFoto(destino, img, { origem: 'estoque', url: urlFotoEstoque(url) })
			setUsadas(u => {
				const novo: Record<string, SlotFoto> = {}
				for (const [k, v] of Object.entries(u)) if (v !== destino) novo[k] = v
				novo[url] = destino
				return novo
			})
		})
	}

	/* -------------------------------------------------- fotos do computador */

	function aoEscolherFotoDoComputador(slot: SlotFoto, file: File) {
		void lerArquivo(file)
			.then(({ img }) => g.aplicarFoto(slot, img, { origem: 'arquivo', arquivo: file }))
			.catch(e => g.setErro(e instanceof Error ? e.message : String(e)))
	}

	function aoEscolherFotoDaLista(indice: number, file: File) {
		void lerArquivo(file)
			.then(({ img }) => {
				imagens.current.estFotos[indice] = img
				g.registrarOrigem(`est${indice as 0 | 1 | 2 | 3}`, { origem: 'arquivo', arquivo: file })
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
			// O histórico entra DEPOIS do download: se guardar falhar (cota, janela
			// anônima), o operador já tem os PNGs na mão.
			const mini = await miniaturaDe(g.canvasRef.current)
			if (mini) {
				await guardar({
					nome: [estado.marca, estado.modelo].map(t => t.trim()).filter(Boolean).join(' ') || nomeDaPeca(estado),
					formato: estado.tipo,
					estado: structuredClone(estado),
					fotos: { ...g.origens.current },
					miniatura: mini,
				})
				await recarregarHistorico()
			}
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

	const propsDoPainel = {
		g,
		aoEscolherFotoDoComputador,
		aoEscolherFotoDaLista,
		aoEscolherLogoModelo: (f: File) =>
			void lerArquivo(f)
				.then(({ img }) => g.definirLogoModelo(img, f))
				.catch(e => g.setErro(e instanceof Error ? e.message : String(e))),
	}

	return (
		// Formulário à esquerda e prévia à direita. Desde 31/10/2026 a prévia tem
		// a largura que a ALTURA da tela permite (9:16 inteira, com o botão de
		// baixar embaixo, sem rolar), e o formulário se divide em duas colunas em
		// tela larga: o que vai escrito na peça | imagem e saída.
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
			{/* O React 19 iça este link para o <head>. É a MESMA folha que o HTML
			    antigo usava: o canvas pede a família "Montserrat" literal, que o
			    next/font do layout não publica. Ver content/…/gerador/fontes.ts. */}
			<link rel="stylesheet" href={FOLHA_GOOGLE} />

			<div className="space-y-5">
				{historico.length > 0 && (
					<Secao titulo={`Criativos gerados nas últimas 24h (${historico.length})`}>
						<div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
							{historico.map(c => (
								<div
									key={c.id}
									className="flex flex-col overflow-hidden rounded-lg border border-border bg-background"
								>
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={miniaturas[c.id]}
										alt={c.nome}
										className="block w-full bg-background-soft object-cover"
										style={{ aspectRatio: '9 / 16' }}
									/>
									<div className="flex flex-1 flex-col gap-2 p-2">
										<div>
											<p className="truncate text-xs font-medium text-foreground" title={c.nome}>
												{c.nome}
											</p>
											<p className="flex items-center gap-1 text-[0.6875rem] text-foreground-secondary">
												<Clock3 className="h-3 w-3" />
												{new Date(c.quando).toLocaleString('pt-BR', {
													dateStyle: 'short',
													timeStyle: 'short',
												})}
											</p>
										</div>
										<div className="mt-auto flex gap-1.5">
											<button
												type="button"
												onClick={() => void editar(c)}
												className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
											>
												<Pencil className="h-3 w-3" />
												Editar
											</button>
											<button
												type="button"
												onClick={() => void descartar(c.id)}
												title="Remover do histórico"
												className="rounded-md border border-border px-2 py-1.5 text-foreground-secondary hover:bg-background-soft"
											>
												<Trash2 className="h-3 w-3" />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
						<Dica>
							Guardado só neste navegador, e apagado sozinho depois de 24h. Editar recarrega a peça
							inteira — campos, enquadramento e fotos — no estado em que ela foi gerada.
						</Dica>
					</Secao>
				)}

				<Secao titulo="Tipo de criativo">
					<Escolha<FormatoId>
						opcoes={FORMATOS}
						valor={estado.tipo}
						aoEscolher={g.trocarFormato}
					/>
				</Secao>

				<div className="grid items-start gap-5 2xl:grid-cols-2">
					{/* ---------- o que vai escrito na peça ---------- */}
					<div className="min-w-0 space-y-5">
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
													onClick={() => void aplicarVeiculo(v)}
													className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-foreground hover:bg-background-soft"
												>
													{v.photos?.[0] ? (
														// eslint-disable-next-line @next/next/no-img-element
														<img
															src={`/_next/image?url=${encodeURIComponent(v.photos[0])}&w=256&q=60`}
															alt=""
															className="h-10 w-14 shrink-0 rounded object-cover"
														/>
													) : (
														<span className="h-10 w-14 shrink-0 rounded bg-background-soft" />
													)}
													<span className="min-w-0">
														<span className="block truncate font-medium">
															{[v.brand, v.model, v.version, v.year_model].filter(Boolean).join(' ')}
														</span>
														<span className="block text-xs text-foreground-secondary">
															{[v.price ? `R$ ${fmtBR(v.price)}` : '', v.mileage ? `${fmtBR(v.mileage)} km` : '']
																.filter(Boolean)
																.join(' · ')}
														</span>
													</span>
												</button>
											</li>
										))}
									</ul>
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

						<PainelCampos parte="conteudo" {...propsDoPainel} />
					</div>

					{/* ---------- imagem e saída ---------- */}
					<div className="min-w-0 space-y-5">
						<PainelCampos parte="imagem" {...propsDoPainel} />

						<Secao titulo="Logo (opcional)">
							<CampoArquivo
								rotulo="PNG transparente"
								aceita="image/png"
								aoEscolher={f =>
									void lerArquivo(f)
										.then(({ img, dados }) => g.definirLogo(img, dados, f))
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
				</div>
			</div>

			{/* ---------- prévia ---------- */}
			<div className="space-y-3 max-lg:mx-auto max-lg:w-full max-lg:max-w-[420px] lg:sticky lg:top-0 lg:w-[clamp(340px,calc((100vh_-_15rem)*0.5625),640px)] lg:self-start">
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
				<p className="text-center text-[0.6875rem] uppercase tracking-wider text-foreground-secondary">
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
