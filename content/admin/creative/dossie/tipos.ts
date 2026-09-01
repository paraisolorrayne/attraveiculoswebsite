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

export interface Dossie {
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

	// ---------- 05 diferenciais ----------
	introDiferenciais: string
	diferenciais: GrupoDiferencial[]

	// ---------- fotos ----------
	/** URLs, na ordem em que aparecem. As três primeiras são capa, hero e ficha. */
	fotos: string[]
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

/** Quantas fotos a galeria consome, duas por página. */
export const FOTOS_POR_PAGINA_GALERIA = 2

/** As três fotos que não são galeria: capa, visão geral e ficha técnica. */
export const FOTOS_FIXAS = 3

export const DOSSIE_INICIAL: Dossie = {
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
	introDiferenciais:
		'Este veículo foi configurado com um pacote de opcionais altamente exclusivo, que eleva ainda mais sua presença, desempenho e acabamento.',
	diferenciais: [
		{ titulo: 'COR & ACABAMENTO', itens: ['', '', ''] },
		{ titulo: 'CONFORTO & TECNOLOGIA', itens: ['', '', ''] },
		{ titulo: 'PERFORMANCE & CONDUÇÃO', itens: ['', '', ''] },
	],
	fotos: [],
	paginasDeGaleria: 8,
	chamada:
		'Consulte nossa equipe para agendar uma visita, solicitar condições de negociação ou avaliar seu veículo na troca.',
}
