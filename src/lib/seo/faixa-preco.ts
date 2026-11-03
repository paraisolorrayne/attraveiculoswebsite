export interface FaixaPrecoPage {
	slug: string
	title: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	oQueDaPraComprar: string
	categorias: { nome: string; descricao: string; modelos: { nome: string; href: string }[] }[]
	perfilComprador: string
	ctaPrimario: string
	ctaSecundario: string
	/** Limites da faixa em reais, para listar o estoque real (null = sem limite). */
	precoMin: number | null
	precoMax: number | null
	/** Perguntas da faixa, com schema FAQPage (handoff de SEO de 02/11/2026). */
	faq: { pergunta: string; resposta: string }[]
}

/**
 * Perguntas que valem para toda faixa: financiamento, troca e entrega são
 * serviços da Attra em qualquer valor.
 */
const FAQ_COMUM = [
	{
		pergunta: 'A Attra aceita meu carro na troca?',
		resposta: 'Sim. A Attra avalia o seu carro e usa o valor na compra do próximo. A avaliação é feita pela equipe da loja, com base no estado, no histórico e no mercado do modelo.',
	},
	{
		pergunta: 'Dá para comprar de outro estado?',
		resposta: 'Sim. A Attra fica em Uberlândia (MG) e entrega em todo o Brasil. O transporte e a entrega são combinados com o consultor na negociação.',
	},
]

export const FAIXAS_PRECO: FaixaPrecoPage[] = [
	{
		slug: 'ate-400-mil',
		title: 'Carros de Luxo até R$ 400 mil',
		metaTitle: 'Carros de Luxo até R$ 400 mil | Seminovos Premium',
		metaDescription: 'Carros de luxo até R$ 400 mil: SUVs e sedãs premium seminovos e esportivos de gerações anteriores, com procedência verificada e entrega em todo o Brasil.',
		keywords: ['carro de luxo até 400 mil', 'carro premium 300 mil', 'suv premium seminovo', 'carro de luxo seminovo barato'],
		oQueDaPraComprar: 'Até R$ 400 mil, o comprador acessa SUVs e sedãs premium seminovos e esportivos de gerações anteriores. É a porta de entrada do mercado premium, e é nela que procedência e histórico de manutenção pesam mais que o ano do carro: dois exemplares do mesmo modelo podem valer coisas muito diferentes.',
		categorias: [
			{
				nome: 'SUV Premium',
				descricao: 'SUVs de marcas premium em gerações recentes, com espaço e tecnologia de sobra.',
				modelos: [
					{ nome: 'Porsche Macan (seminovo)', href: '/comprar/modelo/porsche-macan' },
					{ nome: 'BMW X5 (gerações anteriores)', href: '/comprar/modelo/bmw-x5' },
					{ nome: 'Audi Q7 (seminovo)', href: '/comprar/modelo/audi-q7' },
					{ nome: 'Mercedes GLE (seminovo)', href: '/comprar/modelo/mercedes-gle' },
				],
			},
			{
				nome: 'Esportivo',
				descricao: 'Sedãs esportivos de gerações anteriores, com desempenho de verdade.',
				modelos: [
					{ nome: 'BMW M3 (gerações anteriores)', href: '/comprar/modelo/bmw-m3' },
					{ nome: 'Mercedes C63 AMG (gerações anteriores)', href: '/comprar/modelo/mercedes-c63-amg' },
				],
			},
		],
		perfilComprador: 'Quem está comprando o primeiro carro premium ou trocando um modelo nacional de topo. Quer a experiência de uma marca de luxo sem pagar o preço do zero quilômetro, e precisa de alguém que confira o histórico antes.',
		ctaPrimario: 'Falar com especialista',
		ctaSecundario: 'Receber opções disponíveis',
		precoMin: null,
		precoMax: 400_000,
		faq: [
			{
				pergunta: 'Vale a pena um carro de luxo seminovo até R$ 400 mil?',
				resposta: 'Vale quando o histórico é conhecido. Nessa faixa estão modelos premium com alguns anos de uso, e o que separa uma boa compra de uma dor de cabeça é a manutenção feita na rede autorizada, a quilometragem comprovada e a ausência de sinistro. A Attra confere esses pontos antes de colocar o carro à venda.',
			},
			{
				pergunta: 'A Attra financia carros nessa faixa?',
				resposta: 'Sim. A Attra financia a compra, com entrada e prazo combinados na negociação, e a simulação pode ser feita na página de financiamento do site, com a resposta de um consultor.',
			},
			...FAQ_COMUM,
		],
	},
	{
		slug: '400-a-600-mil',
		title: 'Carros de Luxo de R$ 400 mil a R$ 600 mil',
		metaTitle: 'Carros de Luxo de R$ 400 a R$ 600 mil | Estoque e Opções | Attra Veículos',
		metaDescription: 'Carros de luxo de R$ 400 mil a R$ 600 mil. SUVs premium, sedans esportivos e modelos seminovos com procedência. Attra Veículos.',
		keywords: ['carro de luxo 400 mil', 'carro premium 500 mil', 'carro luxo 600 mil', 'suv premium 400 a 600 mil'],
		oQueDaPraComprar: 'Na faixa de R$ 400 mil a R$ 600 mil, o comprador acessa SUVs premium completos, sedans esportivos de gerações recentes e modelos Porsche de entrada. É a faixa mais competitiva do mercado premium, com ampla oferta de veículos de alta qualidade.',
		categorias: [
			{
				nome: 'SUV Luxo',
				descricao: 'SUVs completos com tecnologia e conforto de referência.',
				modelos: [
					{ nome: 'BMW X5 xDrive40i', href: '/comprar/modelo/bmw-x5' },
					{ nome: 'Porsche Cayenne (seminovo)', href: '/comprar/modelo/porsche-cayenne' },
					{ nome: 'Audi Q7 55 TFSI', href: '/comprar/modelo/audi-q7' },
				],
			},
			{
				nome: 'Esportivo',
				descricao: 'Sedans e cupês esportivos com performance real.',
				modelos: [
					{ nome: 'BMW M3 (geração anterior)', href: '/comprar/modelo/bmw-m3' },
					{ nome: 'Mercedes C63 AMG V8 (seminovo)', href: '/comprar/modelo/mercedes-c63-amg' },
				],
			},
			{
				nome: 'Sedan Premium',
				descricao: 'Sedans de luxo com conforto e tecnologia de topo.',
				modelos: [
					{ nome: 'Mercedes GLE 300d', href: '/comprar/modelo/mercedes-gle' },
					{ nome: 'Porsche Macan GTS', href: '/comprar/modelo/porsche-macan' },
				],
			},
		],
		perfilComprador: 'Profissionais de alto padrão, executivos e empresários que buscam o primeiro veículo premium ou upgrade significativo. Priorizam custo-benefício com qualidade certificada.',
		ctaPrimario: 'Falar com especialista',
		ctaSecundario: 'Receber opções disponíveis',
		precoMin: 400_000,
		precoMax: 600_000,
		faq: [
			{
				pergunta: 'Que carro de luxo comprar com R$ 500 mil?',
				resposta: 'Com R$ 500 mil, os SUVs premium de geração recente são a escolha mais comum: BMW X5, Porsche Cayenne seminovo, Audi Q7 e Mercedes GLE. Para quem quer desempenho, entram os sedãs esportivos, como o BMW M3 e o Mercedes C63 AMG de gerações anteriores.',
			},
			{
				pergunta: 'A Attra financia carros nessa faixa?',
				resposta: 'Sim. A Attra financia a compra, com entrada e prazo combinados na negociação, e a simulação pode ser feita na página de financiamento do site, com a resposta de um consultor.',
			},
			...FAQ_COMUM,
		],
	},
	{
		slug: '600-a-1-milhao',
		title: 'Carros de Luxo de R$ 600 mil a R$ 1 Milhão',
		metaTitle: 'Carros de Luxo de R$ 600 mil a R$ 1 Milhão | Estoque | Attra Veículos',
		metaDescription: 'Carros de luxo de R$ 600 mil a R$ 1 milhão. SUVs de topo, esportivos premium e modelos exclusivos. Attra Veículos.',
		keywords: ['carro de luxo 600 mil', 'carro premium 800 mil', 'carro luxo 1 milhão', 'suv premium 600 mil a 1 milhão'],
		oQueDaPraComprar: 'Entre R$ 600 mil e R$ 1 milhão, o comprador acessa versões de topo de SUVs premium, sedans esportivos da geração atual e supercarros de entrada. É a faixa onde performance e luxo se encontram com amplitude de escolha.',
		categorias: [
			{
				nome: 'SUV Luxo',
				descricao: 'SUVs de topo com motorização e acabamento superiores.',
				modelos: [
					{ nome: 'Porsche Cayenne S/GTS', href: '/comprar/modelo/porsche-cayenne' },
					{ nome: 'BMW X5 M50i', href: '/comprar/modelo/bmw-x5' },
					{ nome: 'Range Rover Sport P530', href: '/comprar/modelo/range-rover-sport' },
					{ nome: 'Audi RS Q8 (seminovo)', href: '/comprar/modelo/audi-q8' },
				],
			},
			{
				nome: 'Esportivo',
				descricao: 'Esportivos de referência com performance de pista.',
				modelos: [
					{ nome: 'BMW M3 Competition', href: '/comprar/modelo/bmw-m3' },
					{ nome: 'Audi RS6 Avant (seminovo)', href: '/comprar/modelo/audi-rs6' },
					{ nome: 'Porsche 911 Carrera (seminovo)', href: '/comprar/modelo/porsche-911' },
				],
			},
			{
				nome: 'Sedan Premium',
				descricao: 'Sedans com o melhor em conforto e tecnologia.',
				modelos: [
					{ nome: 'Mercedes GLE 53 AMG', href: '/comprar/modelo/mercedes-gle' },
					{ nome: 'Audi Q8 55 TFSI', href: '/comprar/modelo/audi-q8' },
				],
			},
		],
		perfilComprador: 'Empresários, investidores e profissionais de alta renda que buscam o melhor do segmento premium sem entrar no território dos supercarros. Valorizam exclusividade com funcionalidade.',
		ctaPrimario: 'Falar com especialista',
		ctaSecundario: 'Receber opções disponíveis',
		precoMin: 600_000,
		precoMax: 1_000_000,
		faq: [
			{
				pergunta: 'O que muda de R$ 600 mil para R$ 1 milhão?',
				resposta: 'Nessa faixa entram as versões de topo dos SUVs premium e os primeiros superesportivos. A diferença para a faixa anterior está nas versões: motores maiores, mais opcionais de fábrica e, em vários modelos, a possibilidade de comprar o carro zero quilômetro.',
			},
			{
				pergunta: 'Seminovo ou zero quilômetro nessa faixa?',
				resposta: 'Depende do modelo. Em versões de alta procura, o seminovo com baixa quilometragem costuma sair bem abaixo do zero quilômetro e perde menos valor nos anos seguintes. Em lançamentos, o zero quilômetro pode ser a única opção. Um consultor da Attra compara os dois caminhos com os carros disponíveis.',
			},
			...FAQ_COMUM,
		],
	},
	{
		slug: 'acima-de-1-milhao',
		title: 'Carros de Luxo Acima de R$ 1 Milhão',
		metaTitle: 'Carros de Luxo Acima de R$ 1 Milhão | Supercarros e Exclusivos | Attra Veículos',
		metaDescription: 'Carros de luxo acima de R$ 1 milhão. Supercarros, versões especiais e veículos exclusivos com procedência. Attra Veículos.',
		keywords: ['carro acima de 1 milhão', 'supercarro à venda', 'carro de luxo exclusivo', 'veículo premium acima 1 milhão'],
		oQueDaPraComprar: 'Acima de R$ 1 milhão, o comprador entra no território dos superesportivos, versões especiais de produção limitada e SUVs de performance extrema. São veículos que combinam exclusividade, engenharia de ponta e potencial de valorização.',
		categorias: [
			{
				nome: 'SUV Luxo',
				descricao: 'SUVs de performance extrema e versões de topo absoluto.',
				modelos: [
					{ nome: 'Porsche Cayenne Turbo GT', href: '/comprar/modelo/porsche-cayenne' },
					{ nome: 'Range Rover Sport SVR', href: '/comprar/modelo/range-rover-sport' },
					{ nome: 'Audi RS Q8', href: '/comprar/modelo/audi-q8' },
				],
			},
			{
				nome: 'Esportivo',
				descricao: 'Superesportivos e versões de coleção.',
				modelos: [
					{ nome: 'Porsche 911 Turbo S', href: '/comprar/modelo/porsche-911' },
					{ nome: 'Porsche 911 GT3', href: '/comprar/modelo/porsche-911' },
					{ nome: 'Audi RS6 Avant Performance', href: '/comprar/modelo/audi-rs6' },
				],
			},
			{
				nome: 'Importação Especial',
				descricao: 'Veículos sob demanda via importação direta.',
				modelos: [
					{ nome: 'Importar Porsche', href: '/importacao/porsche' },
					{ nome: 'Importar Ferrari', href: '/importacao/ferrari' },
					{ nome: 'Importar Lamborghini', href: '/importacao/lamborghini' },
				],
			},
		],
		perfilComprador: 'Colecionadores, investidores e entusiastas com alto patrimônio. Buscam exclusividade, potencial de valorização e experiência de propriedade diferenciada. A compra é tanto emocional quanto racional.',
		ctaPrimario: 'Falar com especialista',
		ctaSecundario: 'Receber opções disponíveis',
		precoMin: 1_000_000,
		precoMax: null,
		faq: [
			{
				pergunta: 'Supercarro acima de R$ 1 milhão perde valor?',
				resposta: 'Alguns perdem, outros mantêm ou valorizam. Versões especiais, de produção limitada e com baixa quilometragem tendem a segurar o preço. O histórico completo, os opcionais de fábrica e a cor pesam tanto quanto o modelo.',
			},
			{
				pergunta: 'A Attra traz um carro que não está no estoque?',
				resposta: 'Sim. A Attra busca o carro sob encomenda no Brasil e, quando o modelo não está disponível aqui, trabalha com importação. O pedido começa pela página Solicitar Veículo ou com um consultor.',
			},
			...FAQ_COMUM,
		],
	},
]

// ---------------------------------------------------------------------------
