/**
 * SEO Content — Layers 3-5
 *
 * Curated editorial content for advanced SEO landing pages.
 *
 * Layer 3: Comparativos + Guias (transactional / informational)
 * Layer 4: Perfil psicológico (psychographic targeting)
 * Layer 5: Expansão geográfica (geographic targeting)
 */

// ---------------------------------------------------------------------------
// Layer 3 — Comparativos
// ---------------------------------------------------------------------------

export interface Comparativo {
	slug: string
	title: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	intro: string
	carA: ComparativoCar
	carB: ComparativoCar
	verdict: string
	ctaText: string
	relatedModels: { brand: string; model: string; href: string }[]
}

interface ComparativoCar {
	brand: string
	model: string
	image?: string
	specs: { label: string; value: string }[]
	pros: string[]
	cons: string[]
	summary: string
}

export const COMPARATIVOS: Comparativo[] = [
	{
		slug: 'bmw-m3-vs-mercedes-c63-amg',
		title: 'BMW M3 vs Mercedes-AMG C 63: Qual o Melhor Sedan Esportivo?',
		metaTitle: 'BMW M3 vs Mercedes C63 AMG | Comparativo Completo',
		metaDescription: 'Comparativo completo entre BMW M3 Competition e Mercedes-AMG C 63 S. Potência, performance, preço e qual vale mais a pena no Brasil. Attra Veículos.',
		keywords: ['bmw m3 vs mercedes c63', 'comparativo sedan esportivo', 'm3 ou c63', 'bmw m3 competition', 'mercedes amg c63 s', 'sedan esportivo brasil'],
		intro: 'Dois titãs do segmento de sedans esportivos premium se enfrentam: o BMW M3 Competition com seu lendário motor S58 de 6 cilindros em linha e o Mercedes-AMG C 63 S com o potente V8 biturbo M177. Ambos representam o auge da engenharia alemã — mas para perfis de motorista muito diferentes.',
		carA: {
			brand: 'BMW',
			model: 'M3 Competition',
			specs: [
				{ label: 'Motor', value: 'S58 3.0L 6 cilindros biturbo' },
				{ label: 'Potência', value: '510 cv @ 6.250 rpm' },
				{ label: 'Torque', value: '650 Nm @ 2.750 rpm' },
				{ label: '0–100 km/h', value: '3,9 s' },
				{ label: 'Câmbio', value: 'M Steptronic 8 marchas' },
				{ label: 'Tração', value: 'Traseira (M xDrive opcional)' },
				{ label: 'Peso', value: '1.730 kg' },
			],
			pros: [
				'Motor 6 cilindros mais preciso e linear',
				'Equilíbrio dinâmico referência — feedback de volante superior',
				'Diferencial M ativo para saídas de curva controladas',
				'Modo tração traseira pura disponível',
			],
			cons: [
				'Design frontal polarizador na geração G80',
				'Interior funcional mas menos luxuoso que o rival',
				'Suspensão mais firme no dia a dia',
			],
			summary: 'O M3 Competition é o sedan para quem prioriza a conexão com a estrada. Seu motor 6 cilindros em linha responde com precisão cirúrgica e o chassi comunica cada imperfeição do asfalto — exatamente o que um entusiasta deseja.',
		},
		carB: {
			brand: 'Mercedes-AMG',
			model: 'C 63 S',
			specs: [
				{ label: 'Motor', value: 'M177 4.0L V8 biturbo' },
				{ label: 'Potência', value: '510 cv @ 5.500 rpm' },
				{ label: 'Torque', value: '700 Nm @ 1.750 rpm' },
				{ label: '0–100 km/h', value: '4,0 s' },
				{ label: 'Câmbio', value: 'AMG SPEEDSHIFT MCT 9G' },
				{ label: 'Tração', value: 'Traseira' },
				{ label: 'Peso', value: '1.825 kg' },
			],
			pros: [
				'Motor V8 biturbo com sonoridade inigualável',
				'Torque brutal desde baixas rotações — presença imponente',
				'Interior mais luxuoso e acabamento superior',
				'Presença de rua e status elevados',
			],
			cons: [
				'Mais pesado — perceptível em curvas técnicas',
				'Nova geração migrou para 4 cilindros híbrido (perda do V8)',
				'Consumo mais elevado que o rival de 6 cilindros',
			],
			summary: 'O C 63 S é o sedan para quem valoriza brutalidade refinada. O V8 biturbo entrega emoção visceral a cada acelerada, e o interior combina luxo com esportividade — perfeito para quem quer presença sem abrir mão do conforto.',
		},
		verdict: 'Se você busca a experiência de pilotagem mais pura e comunicativa, o BMW M3 Competition é imbatível. Se prefere a experiência sensorial do V8 com um interior mais luxuoso e presença imponente, o Mercedes-AMG C 63 S é a escolha. Ambos são excepcionais — a decisão depende do seu perfil de motorista. Na Attra Veículos, oferecemos curadoria de ambos com procedência verificada e entrega nacional.',
		ctaText: 'Conheça sedans esportivos disponíveis na Attra',
		relatedModels: [
			{ brand: 'BMW', model: 'M3', href: '/comprar/bmw/m3' },
			{ brand: 'Mercedes-AMG', model: 'AMG GT', href: '/comprar/mercedes-benz/amg-gt' },
			{ brand: 'Audi', model: 'R8', href: '/comprar/audi/r8' },
		],
	},
]

// ---------------------------------------------------------------------------
// Layer 3 — Guias de compra
// ---------------------------------------------------------------------------

export interface GuiaCompra {
	slug: string
	title: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	intro: string
	sections: { heading: string; content: string }[]
	ctaText: string
	relatedLinks: { label: string; href: string }[]
}

export const GUIAS_COMPRA: GuiaCompra[] = [
	{
		slug: 'como-comprar-carro-de-luxo-no-brasil',
		title: 'Como Comprar Carro de Luxo no Brasil: Guia Completo 2025',
		metaTitle: 'Como Comprar Carro de Luxo no Brasil | Guia Completo 2025',
		metaDescription: 'Guia completo para comprar carro de luxo no Brasil. Dicas sobre financiamento, documentação, importação e como evitar armadilhas. Attra Veículos — desde 2009.',
		keywords: ['como comprar carro de luxo', 'comprar carro de luxo brasil', 'guia carro premium', 'financiamento carro luxo', 'importar carro luxo brasil'],
		intro: 'Adquirir um veículo de luxo no Brasil envolve decisões que vão muito além do preço. Procedência, documentação, estado de conservação e o canal de compra fazem toda a diferença entre um investimento inteligente e uma dor de cabeça. Este guia reúne tudo que você precisa saber para fazer uma compra segura e satisfatória.',
		sections: [
			{
				heading: '1. Defina Seu Perfil e Orçamento',
				content: 'Antes de buscar modelos, entenda o que você realmente precisa. Um superesportivo como Ferrari ou Porsche 911 exige estrutura de manutenção especializada. Um SUV premium como Range Rover ou BMW X5 atende melhor o dia a dia com família. O orçamento total deve contemplar não apenas o preço do veículo, mas seguro (que pode chegar a 8-12% do valor), manutenção anual e eventual desvalorização.',
			},
			{
				heading: '2. Procedência e Documentação',
				content: 'Verifique sempre: histórico do veículo no Detran (multas, sinistros, alienação), laudo cautelar completo por empresa credenciada, comprovante de revisões na rede autorizada, e se o veículo foi importado oficialmente pelo representante no Brasil. Veículos importados diretamente (sem representante oficial) podem ter restrições de garantia e peças.',
			},
			{
				heading: '3. Financiamento Premium',
				content: 'Financiar carros de luxo exige bancos especializados. Instituições como Itaú BBA, Safra e BV oferecem linhas específicas para veículos acima de R$ 500 mil, com taxas diferenciadas e prazos de até 60 meses. A entrada mínima geralmente é de 30-50% do valor. Algumas marcas como Porsche e BMW possuem seus próprios bancos com condições exclusivas.',
			},
			{
				heading: '4. Onde Comprar: Loja Especializada vs Particular',
				content: 'Comprar de uma loja especializada como a Attra Veículos oferece vantagens significativas: curadoria rigorosa de cada veículo, garantia da loja, documentação tratada, e suporte pós-venda. Na compra particular, você assume todos os riscos de procedência e eventuais problemas ocultos. Para veículos acima de R$ 300 mil, a segurança de uma loja especializada compensa a pequena diferença de preço.',
			},
			{
				heading: '5. Inspeção e Test Drive',
				content: 'Nunca compre um carro de luxo sem inspecioná-lo pessoalmente ou através de um perito de confiança. Verifique pintura original (uso de medidor de espessura), interior sem sinais de desgaste incompatíveis com a quilometragem, funcionamento de todos os sistemas eletrônicos, e estado dos pneus e freios. Um test drive é fundamental para avaliar a condição mecânica real.',
			},
			{
				heading: '6. Seguro e Manutenção',
				content: 'O seguro de veículos premium é proporcionalmente mais caro. Para supercarros como Ferrari e Lamborghini, o seguro pode custar 10-15% do valor do veículo ao ano. Negocie com corretoras especializadas em alta renda. Quanto à manutenção, planeje revisões periódicas na rede autorizada — o custo é alto, mas preserva o valor de revenda e a segurança.',
			},
			{
				heading: '7. Entrega e Logística',
				content: 'Para compras à distância, exija transporte em caminhão fechado com seguro completo. Lojas como a Attra Veículos oferecem logística especializada para todo o Brasil, com rastreamento em tempo real e seguro de transporte que cobre o valor integral do veículo.',
			},
		],
		ctaText: 'Explore nosso estoque de veículos premium com procedência verificada',
		relatedLinks: [
			{ label: 'Comprar Porsche no Brasil', href: '/comprar/porsche' },
			{ label: 'Comprar Ferrari no Brasil', href: '/comprar/ferrari' },
			{ label: 'Comprar BMW no Brasil', href: '/comprar/bmw' },
			{ label: 'Comprar Mercedes-Benz no Brasil', href: '/comprar/mercedes-benz' },
			{ label: 'Financiamento Premium', href: '/financiamento' },
			{ label: 'Ver todos os veículos', href: '/veiculos' },
		],
	},
]

// ---------------------------------------------------------------------------
// Layer 4 — Perfis psicológicos
// ---------------------------------------------------------------------------

export interface PerfilComprador {
	slug: string
	title: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	intro: string
	profileDescription: string
	recommendedCategories: { label: string; description: string; models: { name: string; href: string }[] }[]
	ctaText: string
}

export const PERFIS_COMPRADOR: PerfilComprador[] = [
	{
		slug: 'executivo-luxo',
		title: 'Carro para Executivo de Luxo no Brasil',
		metaTitle: 'Carro para Executivo Luxo Brasil | Melhores Opções 2025',
		metaDescription: 'Os melhores carros para executivos de luxo no Brasil. Sedans esportivos, SUVs premium e GT para quem valoriza performance, status e conforto. Attra Veículos.',
		keywords: ['carro executivo luxo brasil', 'carro para executivo', 'sedan executivo premium', 'suv executivo luxo', 'carro alto padrão executivo'],
		intro: 'O executivo de alto padrão brasileiro tem necessidades específicas: um veículo que projete autoridade e sucesso, ofereça conforto para longas jornadas e entregue performance quando a estrada abre. Não se trata apenas de transporte — é uma extensão da personalidade profissional.',
		profileDescription: 'O perfil executivo de luxo valoriza discrição elegante sobre ostentação. Busca acabamento impecável, tecnologia de ponta e um motor que responda com convicção. O veículo precisa funcionar tanto no trânsito urbano quanto em viagens a negócios, com presença que dispense apresentações.',
		recommendedCategories: [
			{
				label: 'Sedans Esportivos Premium',
				description: 'Performance e elegância para o dia a dia executivo.',
				models: [
					{ name: 'BMW M3 Competition', href: '/comprar/bmw/m3' },
					{ name: 'Mercedes-AMG GT', href: '/comprar/mercedes-benz/amg-gt' },
				],
			},
			{
				label: 'SUVs Premium',
				description: 'Versatilidade e presença para quem precisa de espaço sem abrir mão do luxo.',
				models: [
					{ name: 'Porsche Cayenne', href: '/comprar/porsche/cayenne' },
					{ name: 'BMW X5', href: '/comprar/bmw/x5' },
					{ name: 'Range Rover', href: '/comprar/land-rover/range-rover' },
					{ name: 'Mercedes G 63 AMG', href: '/comprar/mercedes-benz/g63-amg' },
				],
			},
			{
				label: 'Gran Turismo',
				description: 'Para o executivo que também é entusiasta — quando o fim de semana pede emoção.',
				models: [
					{ name: 'Ferrari Roma', href: '/comprar/ferrari/roma' },
					{ name: 'Porsche 911', href: '/comprar/porsche/911' },
				],
			},
		],
		ctaText: 'Fale com um especialista Attra para encontrar o veículo ideal para seu perfil',
	},
]

// ---------------------------------------------------------------------------
// Layer 5 — Expansão geográfica
// ---------------------------------------------------------------------------

export interface RegiaoSEO {
	slug: string
	state: string
	capital: string
	title: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	intro: string
	localContext: string
	deliveryInfo: string
	ctaText: string
	relatedBrands: { name: string; href: string }[]
}

export const REGIOES_SEO: RegiaoSEO[] = [
	{
		slug: 'minas-gerais',
		state: 'Minas Gerais',
		capital: 'Belo Horizonte',
		title: 'Comprar Carro de Luxo em Minas Gerais',
		metaTitle: 'Comprar Carro de Luxo em Minas Gerais | Attra Veículos',
		metaDescription: 'Carros de luxo e supercarros à venda em Minas Gerais. Entrega em BH, Uberlândia e todo o estado. Ferrari, Porsche, BMW, Mercedes e mais. Attra Veículos — desde 2009.',
		keywords: ['carro de luxo minas gerais', 'comprar carro luxo bh', 'carro premium uberlândia', 'supercarros minas gerais', 'loja de luxo veiculos mg'],
		intro: 'Minas Gerais é o segundo maior mercado de veículos premium do Brasil, com Belo Horizonte e Uberlândia liderando a demanda por supercarros e veículos de alto padrão. A Attra Veículos, sediada em Uberlândia com mais de 15 anos de experiência, atende todo o estado com curadoria rigorosa e entrega especializada.',
		localContext: 'Com sede na Av. Rondon Pacheco em Uberlândia, a Attra Veículos está estrategicamente posicionada no Triângulo Mineiro — região com um dos maiores PIBs per capita do estado. Atendemos presencialmente clientes de Uberlândia, Uberaba, Araguari e região, e realizamos entrega porta a porta em Belo Horizonte, Juiz de Fora, Montes Claros e qualquer cidade de Minas Gerais.',
		deliveryInfo: 'A entrega é feita em caminhão fechado com seguro completo e rastreamento em tempo real. Para clientes de BH e Triângulo Mineiro, a entrega é ágil — geralmente entre 1 a 3 dias úteis. Demais cidades de MG recebem em até 5 dias úteis.',
		ctaText: 'Veja o estoque disponível para Minas Gerais',
		relatedBrands: [
			{ name: 'Porsche', href: '/comprar/porsche' },
			{ name: 'Ferrari', href: '/comprar/ferrari' },
			{ name: 'BMW', href: '/comprar/bmw' },
			{ name: 'Mercedes-Benz', href: '/comprar/mercedes-benz' },
			{ name: 'Land Rover', href: '/comprar/land-rover' },
			{ name: 'Audi', href: '/comprar/audi' },
		],
	},
]

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function findComparativo(slug: string) {
	return COMPARATIVOS.find(c => c.slug === slug)
}
export function findGuia(slug: string) {
	return GUIAS_COMPRA.find(g => g.slug === slug)
}
export function findPerfil(slug: string) {
	return PERFIS_COMPRADOR.find(p => p.slug === slug)
}
export function findRegiao(slug: string) {
	return REGIOES_SEO.find(r => r.slug === slug)
}
