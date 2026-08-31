/**
 * Tipos do Gerador de Criativos.
 *
 * Porte do `state` global e dos campos do formulário que viviam em
 * content/admin/gerador-criativos.html. A divisão em dois é deliberada:
 *
 *   EstadoCriativo      — só dado serializável, o que o React guarda em useState
 *   ImagensDoOperador   — HTMLImageElement, que fica em useRef
 *
 * Imagem não entra em estado de React: não é serializável, e trocá-la deve
 * disparar redesenho, não reconciliação de árvore.
 */

export const LARGURA = 1080
export const ALTURA_STORIES = 1920
/** Feed 4:5 da Meta — a mesma composição, só com a foto principal. */
export const ALTURA_FEED = 1350

export type FormatoId = 'classico' | 'classico-loja' | 'destaque' | 'estoque' | 'ficha'

export type PisoTipo = 'concreto' | 'asfalto'

export type SlotFoto = 'foto1' | 'foto2' | 'foto3' | 'foto4'

/** Enquadramento de uma foto dentro da caixa que a recebe. */
export interface OpcoesFoto {
	/** 1 = a foto preenche a caixa; acima disso, amplia. */
	zoom: number
	/** 0 a 1, onde 0,5 é o centro. */
	x: number
	y: number
}

/** Um dos quatro carros da lista do formato Estoque. */
export interface CarroEstoque {
	nome: string
	ano: string
	km: string
	preco: string
	tag: string
}

export interface EstadoCriativo {
	tipo: FormatoId

	// Identificação do veículo (Clássico, Clássico Loja, Destaque, Editorial, Ficha)
	marca: string
	modelo: string
	ano: string
	preco: string
	km: string
	/** Texto extra ao lado do km — "ÚNICO DONO", por exemplo. */
	kmextra: string

	/** Destaques do Clássico e do Clássico Loja: no máximo três, uma linha cada. */
	b1: string
	b2: string
	b3: string

	/** Pílulas do Destaque, separadas por vírgula. */
	selo: string

	// Ficha
	rot1: string
	corext: string
	rot2: string
	corint: string
	garantia: string

	// Estoque
	et1: string
	et2: string
	estoque: CarroEstoque[]

	// Ajustes de composição
	/** Corte transversal do Clássico: positivo sobe a divisa. */
	corte: number
	/** Deslocamento vertical do bloco de texto sobre o piso. */
	pisoy: number
	pisoTipo: PisoTipo

	f1: OpcoesFoto
	f2: OpcoesFoto
	f3: OpcoesFoto
	f4: OpcoesFoto

	/** Destino do clique na galeria do estoque (usado pela Ficha). */
	slotFoto: SlotFoto
}

/** As imagens que o operador carregou ou escolheu do estoque. */
export interface ImagensDoOperador {
	foto1: HTMLImageElement | null
	foto2: HTMLImageElement | null
	foto3: HTMLImageElement | null
	foto4: HTMLImageElement | null
	/** As quatro fotos dos carros do formato Estoque. */
	estFotos: (HTMLImageElement | null)[]
	/** Logo enviada pelo operador, que substitui a oficial no Clássico. */
	logo: HTMLImageElement | null
}

/** Imagens fixas da marca, servidas de /public/gerador/. */
export interface Assets {
	/** Logo oficial branca, para fundos escuros. */
	logoBranca: HTMLImageElement
	/** Logo preta com o branco já convertido em transparente. */
	logoPreta: CanvasImageSource
	/** Close do letreiro, fundo do topo do Clássico original. */
	fachadaClassico: HTMLImageElement
	/** Foto inteira da loja, fundo do Clássico Loja. */
	fachadaLoja: HTMLImageElement
	pisoConcreto: HTMLImageElement
	pisoAsfalto: HTMLImageElement
}

/** Tudo o que uma função de formato precisa para desenhar. */
export interface ContextoDesenho {
	ctx: CanvasRenderingContext2D
	estado: EstadoCriativo
	imagens: ImagensDoOperador
	assets: Assets
	/** ALTURA_STORIES ou ALTURA_FEED — cada formato tem um ramo para o Feed. */
	altura: number
}

export const ESTADO_INICIAL: EstadoCriativo = {
	tipo: 'classico',
	marca: 'MERCEDES-BENZ',
	modelo: 'C-300 AMG LINE',
	ano: '2024',
	preco: '335.000',
	km: '34.760',
	kmextra: '',
	b1: 'Cor Cinza Selenita Magno',
	b2: 'Motor 2.0 turbo gasolina 285 cv / 61,2 kgfm',
	b3: 'Pacote AMG Line',
	selo: 'BLINDADO',
	rot1: 'EXTERIOR',
	corext: 'PRETO',
	rot2: 'INTERIOR',
	corint: 'CARAMELO',
	garantia: '2 ANOS DE GARANTIA',
	et1: 'NOVIDADES',
	et2: 'EM ESTOQUE!',
	estoque: [
		{ nome: 'Porsche 911 Carrera', ano: '2025/2026', km: '1.290', preco: '1.250.000', tag: 'BLINDADO' },
		{ nome: 'Mercedes AMG S 63 E Performance', ano: '2025/2025', km: '3.392', preco: '1.890.000', tag: 'BLINDADO' },
		{ nome: 'Audi RS Q8 TFSI', ano: '2020/2021', km: '12.584', preco: '790.000', tag: '' },
		{ nome: '', ano: '', km: '', preco: '', tag: '' },
	],
	// Estes dois nascem negativos porque os sliders do HTML nascem assim
	// (corte value="-32", pisoy value="-18"). Zerar aqui abriria a peça padrão
	// diferente do que os controles mostram.
	corte: -32,
	pisoy: -18,
	pisoTipo: 'concreto',
	// Enquadramento padrão da foto de cima, calibrado pela Lorrayne no próprio
	// gerador (04/08/2026): recua o zoom para o carro não abrir espremido nas
	// bordas e sobe o corte para o veículo ficar abaixo do título. Tem que casar
	// com os valores iniciais dos sliders, senão a peça abre diferente do que
	// eles mostram.
	f1: { zoom: 0.88, x: 0.5, y: 0.18 },
	f2: { zoom: 1, x: 0.5, y: 0.5 },
	f3: { zoom: 1, x: 0.5, y: 0.5 },
	f4: { zoom: 1, x: 0.5, y: 0.5 },
	slotFoto: 'foto1',
}

export const IMAGENS_VAZIAS: ImagensDoOperador = {
	foto1: null,
	foto2: null,
	foto3: null,
	foto4: null,
	estFotos: [null, null, null, null],
	logo: null,
}
