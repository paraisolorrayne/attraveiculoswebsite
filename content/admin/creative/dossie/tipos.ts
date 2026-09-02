/**
 * O dossiê técnico da Attra — modelo de dados.
 *
 * Documento A4 de 22 páginas entregue ao cliente antes da visita. Nasceu feito
 * à mão no Vantage S (ver o PDF de referência); aqui vira formulário.
 *
 * POR QUE QUASE TUDO É DIGITADO. O estoque tem marca, modelo, ano, km, preço,
 * cor e fotos — e nada da ficha técnica: `engine`, `horsepower`, `torque`,
 * `acceleration`, `top_speed` e `options` vêm todos nulos da API. Pior, o que
 * ele tem às vezes discorda do dossiê: no Aston o estoque diz "Vantage / Cupê
 * V8 510cv / Verde", enquanto a peça diz "Vantage S / 680cv / Podium Green".
 * Quem monta o dossiê pesquisa e confere; o gerador preenche o que dá e deixa o
 * resto em branco, de propósito, em vez de chutar.
 */

import type { EstiloCapa } from './capas'

/** Uma linha rótulo/valor das tabelas da ficha técnica. */
export interface LinhaFicha {
	rotulo: string
	valor: string
}

/** Um bloco de destaques com ícone, na página de diferenciais. */
export interface GrupoDiferencial {
	titulo: string
	itens: string[]
}

/**
 * Quanto documento o cliente recebe.
 *
 *   completo  As 22 páginas do dossiê original: capa, carta ao cliente, visão
 *             geral, ficha técnica, diferenciais, galeria e contracapa.
 *   enxuto    Capa, UMA página de resumo da ficha, e o resto são as fotos do
 *             carro. Some a carta (o texto grande), somem as páginas separadas
 *             de visão geral, ficha e diferenciais — o que elas diziam cabe
 *             condensado numa página só.
 *
 * O enxuto não é o completo com páginas apagadas: como sobram menos posições
 * fixas de foto, a galeria começa mais cedo e o mesmo carro rende mais páginas
 * de imagem.
 */
export type ModeloDossie = 'completo' | 'enxuto'

export const MODELOS: { id: ModeloDossie; rotulo: string; resumo: string }[] = [
	{ id: 'completo', rotulo: 'Completo', resumo: 'Carta, visão geral, ficha e diferenciais' },
	{ id: 'enxuto', rotulo: 'Enxuto', resumo: 'Resumo da ficha e o resto em fotos' },
]

export interface Dossie {
	/** Quanto documento o cliente recebe — ver ModeloDossie. */
	modeloDoDossie: ModeloDossie
	/** Qual das três capas usar — ver capas.ts. */
	estiloCapa: EstiloCapa

	// ---------- identificação, usada em várias páginas ----------
	marca: string
	modelo: string
	/** "V8 BI-TURBO · 680CV" — a linha fina sob o nome, na capa e na contracapa. */
	assinatura: string
	ano: string
	cor: string
	km: string

	// ---------- 03 visão geral ----------
	anoModelo: string
	quilometragem: string
	corExterna: string
	interior: string
	motorizacao: string
	tracao: string
	/** O selo com barra vermelha: "IPVA 2026 integralmente pago". */
	documentacaoTitulo: string
	documentacaoDetalhe: string
	/** Parágrafo de fecho da visão geral. */
	resumo: string

	// ---------- 04 ficha técnica ----------
	performance: LinhaFicha[]
	dimensoes: LinhaFicha[]
	suspensao: LinhaFicha[]
	/** Nota em itálico sob a tabela de performance. */
	notaPerformance: string

	/**
	 * Opcionais em texto livre, na página de resumo do modelo enxuto.
	 *
	 * Texto corrido de propósito, e não a lista estruturada de `diferenciais`:
	 * no enxuto o operador quer digitar o que o carro tem e imprimir, sem
	 * distribuir item por item em três grupos com título.
	 */
	opcionaisTexto: string

	// ---------- 05 diferenciais ----------
	introDiferenciais: string
	diferenciais: GrupoDiferencial[]

	// ---------- fotos ----------
	/**
	 * URLs por POSIÇÃO — o mapa de qual posição vai para onde está em slots.ts.
	 * Buracos são string vazia, nunca `undefined`.
	 */
	fotos: string[]
	/**
	 * A foto da contracapa. Campo próprio desde 02/09/2026: antes o documento
	 * usava `fotos[fotos.length - 1]`, e a última foto da galeria aparecia duas
	 * vezes no mesmo dossiê. Vazio mantém o comportamento antigo.
	 */
	fotoFinal: string
	/** Todas as fotos do veículo escolhido, para o operador trocar slot por slot. */
	galeria: string[]
	/** Quantas páginas de galeria (duas fotos cada). */
	paginasDeGaleria: number

	// ---------- contracapa ----------
	chamada: string
}

/**
 * A carta ao cliente é texto FIXO com o modelo trocado.
 *
 * Foi decisão da Lorrayne (01/09/2026): a mesma carta do Vantage serve sempre,
 * revisada uma vez. A alternativa — pedir à IA um parágrafo por carro — daria
 * mais impacto e exigiria leitura dela a cada dossiê.
 */
export function cartaAoCliente(marca: string, modelo: string): string[] {
	const carro = `${marca} ${modelo}`.trim() || 'veículo'
	return [
		'Receber seu contato aqui na **Attra Veículos** é motivo de grande satisfação para toda a nossa equipe.',
		`Sabemos que veículos como o **${carro}** não são apenas máquinas — são declarações de estilo, potência e personalidade. Por isso, este dossiê foi preparado com atenção aos mínimos detalhes, reunindo informações técnicas, visuais e exclusividades que refletem o padrão elevado que você valoriza.`,
		'A confiança demonstrada ao considerar a Attra como parceira nessa escolha é algo que levamos com seriedade e respeito. Mais do que apresentar um automóvel, queremos proporcionar uma experiência à altura da expectativa que esse momento merece.',
		'Será um prazer seguir ao seu lado neste processo.',
	]
}

/**
 * Quanto texto de opcionais cabe na página de resumo, em caracteres.
 *
 * MEDIDO, não estimado (02/09/2026), variando o texto de 800 a 3200 caracteres
 * e lendo a altura ocupada contra os 297mm da folha:
 *
 *   vazio a ~900   a faixa cresce até o teto de 118mm e fecha a página
 *         ~1.700   a faixa volta aos 66mm e o texto ocupa o resto
 *          2.400   faixa no piso de 26mm: o limite físico, sem folga nenhuma
 *          2.800   passa 87px — o fim do texto seria cortado na impressão
 *
 * O aviso dispara em 2.200, e não em 2.400: o limite físico varia com o
 * tamanho dos outros campos (um "Motor" de duas linhas come espaço), e avisar
 * só no exato significa não avisar em metade dos casos.
 *
 * A tela avisa e NÃO trunca. Cortar o texto do operador sem ele ver é pior que
 * imprimir uma página apertada — quem escreveu é quem sabe o que encurtar.
 */
export const LIMITE_OPCIONAIS = 2200

/** Quantas fotos a galeria consome, duas por página. */
export const FOTOS_POR_PAGINA_GALERIA = 2

/** As três fotos que não são galeria: capa, visão geral e ficha técnica. */
export const FOTOS_FIXAS = 3

export const DOSSIE_INICIAL: Dossie = {
	modeloDoDossie: 'completo',
	estiloCapa: 'corte',
	marca: '',
	modelo: '',
	assinatura: '',
	ano: '',
	cor: '',
	km: '',
	anoModelo: '',
	quilometragem: '',
	corExterna: '',
	interior: '',
	motorizacao: '',
	tracao: '',
	documentacaoTitulo: '',
	documentacaoDetalhe: '',
	resumo: '',
	performance: [
		{ rotulo: 'MOTOR', valor: '' },
		{ rotulo: 'POTÊNCIA MÁXIMA', valor: '' },
		{ rotulo: 'TORQUE MÁXIMO', valor: '' },
		{ rotulo: 'FAIXA DE TORQUE', valor: '' },
		{ rotulo: 'TRANSMISSÃO', valor: '' },
		{ rotulo: 'TRAÇÃO', valor: '' },
		{ rotulo: '0 – 100 KM/H', valor: '' },
		{ rotulo: '0 – 200 KM/H', valor: '' },
		{ rotulo: 'VELOCIDADE MÁXIMA', valor: '' },
	],
	dimensoes: [
		{ rotulo: 'COMPRIMENTO', valor: '' },
		{ rotulo: 'LARGURA', valor: '' },
		{ rotulo: 'ALTURA', valor: '' },
		{ rotulo: 'ENTRE-EIXOS', valor: '' },
		{ rotulo: 'PESO', valor: '' },
		{ rotulo: 'PORTA-MALAS', valor: '' },
	],
	suspensao: [
		{ rotulo: 'SUSPENSÃO', valor: '' },
		{ rotulo: 'DIREÇÃO', valor: '' },
		{ rotulo: 'FREIOS', valor: '' },
		{ rotulo: 'PORTAS', valor: '' },
	],
	notaPerformance: '',
	opcionaisTexto: '',
	introDiferenciais:
		'Este veículo foi configurado com um pacote de opcionais altamente exclusivo, que eleva ainda mais sua presença, desempenho e acabamento.',
	diferenciais: [
		{ titulo: 'COR & ACABAMENTO', itens: ['', '', ''] },
		{ titulo: 'CONFORTO & TECNOLOGIA', itens: ['', '', ''] },
		{ titulo: 'PERFORMANCE & CONDUÇÃO', itens: ['', '', ''] },
	],
	fotos: [],
	fotoFinal: '',
	galeria: [],
	paginasDeGaleria: 8,
	chamada:
		'Consulte nossa equipe para agendar uma visita, solicitar condições de negociação ou avaliar seu veículo na troca.',
}
