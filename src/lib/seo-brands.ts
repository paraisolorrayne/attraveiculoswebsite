/**
 * SEO Brand & Model Data
 *
 * Curated editorial content for SEO landing pages. These pages act as
 * "search hooks" — designed to capture transactional search traffic
 * (e.g. "comprar porsche brasil") and funnel to vehicle detail pages.
 *
 * Not exposed in main navigation. Discoverable via search engines,
 * sitemap, and internal links from vehicle pages.
 */

export interface SEOBrand {
	slug: string
	name: string
	displayName: string
	country: string
	tagline: string
	description: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	models: SEOModel[]
	highlights: string[]
}

export interface SEOModel {
	slug: string
	name: string
	fullName: string
	tagline: string
	description: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	category: 'supercar' | 'sports' | 'luxury' | 'suv' | 'sedan' | 'coupe' | 'gt'
	priceRange?: string
	highlights: string[]
}

export const SEO_BRANDS: SEOBrand[] = [
	{
		slug: 'porsche',
		name: 'Porsche',
		displayName: 'Porsche',
		country: 'Alemanha',
		tagline: 'Performance e tradição desde 1931',
		description: 'A Porsche combina engenharia alemã de precisão com performance esportiva lendária. Do icônico 911 ao versátil Cayenne, cada modelo carrega décadas de DNA de competição — das 24 Horas de Le Mans direto para as ruas.',
		metaTitle: 'Comprar Porsche no Brasil | Porsche Seminovo e 0 km',
		metaDescription: 'Porsche à venda no Brasil com procedência verificada. 911, Cayenne, Macan e mais. Curadoria premium, entrega nacional e financiamento. Attra Veículos.',
		keywords: ['comprar porsche brasil', 'porsche seminovo brasil', 'porsche à venda', 'porsche preço brasil', 'concessionária porsche'],
		highlights: [
			'Motor boxer traseiro — DNA único no segmento',
			'Mais de 30.000 vitórias em competição',
			'PDK — câmbio de dupla embreagem referência mundial',
			'Valorização acima da média no mercado premium',
		],
		models: [
			{
				slug: '911',
				name: '911',
				fullName: 'Porsche 911',
				tagline: 'O esportivo mais icônico do mundo',
				description: 'O Porsche 911 é o esportivo definitivo: motor boxer traseiro, silhueta inconfundível e performance que evolui sem perder a essência. Do Carrera ao Turbo S, cada versão é uma declaração de engenharia e paixão.',
				metaTitle: 'Porsche 911 à Venda no Brasil | Carrera, Turbo, GT3',
				metaDescription: 'Comprar Porsche 911 no Brasil. Versões Carrera, Turbo S, GT3 com procedência verificada. Preços, specs e fotos. Entrega nacional — Attra Veículos.',
				keywords: ['porsche 911 preço brasil', 'comprar porsche 911', 'porsche 911 seminovo', 'porsche 911 carrera', 'porsche 911 turbo s'],
				category: 'sports',
				highlights: ['Motor boxer 6 cilindros — tradição desde 1963', 'Versões de 385 cv (Carrera) a 650 cv (Turbo S)', 'Tração traseira ou integral (Carrera 4)', 'Valorização superior — referência no mercado'],
			},
			{
				slug: 'cayenne',
				name: 'Cayenne',
				fullName: 'Porsche Cayenne',
				tagline: 'Performance SUV redefinida',
				description: 'O Porsche Cayenne prova que um SUV pode ter alma esportiva. Com motor biturbo, suspensão ativa e espaço para a família, é a escolha de quem não abre mão de performance no dia a dia.',
				metaTitle: 'Porsche Cayenne à Venda no Brasil | SUV Premium',
				metaDescription: 'Comprar Porsche Cayenne no Brasil. SUV premium com performance esportiva. Procedência verificada, fotos e financiamento — Attra Veículos.',
				keywords: ['porsche cayenne preço brasil', 'comprar porsche cayenne', 'porsche cayenne seminovo', 'suv porsche brasil'],
				category: 'suv',
				highlights: ['Motor V6 ou V8 biturbo', 'Suspensão pneumática adaptativa', 'Até 5 lugares com porta-malas de 772 L', 'Torque Vectoring Plus para estabilidade'],
			},
			{
				slug: 'macan',
				name: 'Macan',
				fullName: 'Porsche Macan',
				tagline: 'O SUV compacto mais esportivo do segmento',
				description: 'O Porsche Macan é o SUV compacto que dirige como esportivo. Ágil, preciso e com o DNA Porsche em cada curva — perfeito para quem busca esportividade no cotidiano urbano.',
				metaTitle: 'Porsche Macan à Venda no Brasil | SUV Esportivo',
				metaDescription: 'Comprar Porsche Macan no Brasil. SUV esportivo compacto com motor turbo. Seminovo e 0 km com procedência. Attra Veículos — entrega nacional.',
				keywords: ['porsche macan preço brasil', 'comprar porsche macan', 'porsche macan seminovo', 'macan turbo brasil'],
				category: 'suv',
				highlights: ['Motor turbo 4 cilindros ou V6', 'Tração integral Porsche Traction Management', 'Chassi esportivo com PASM', 'Infotainment PCM com Apple CarPlay'],
			},
		],
	},
	{
		slug: 'ferrari',
		name: 'Ferrari',
		displayName: 'Ferrari',
		country: 'Itália',
		tagline: 'O auge da performance italiana',
		description: 'Ferrari não é apenas um fabricante de carros — é uma lenda viva do automobilismo. Cada veículo que sai de Maranello carrega 75 anos de história em Fórmula 1, tecnologia de pista e uma emoção que nenhuma outra marca consegue replicar.',
		metaTitle: 'Comprar Ferrari no Brasil | Ferrari à Venda',
		metaDescription: 'Ferrari à venda no Brasil com procedência verificada. Roma, SF90, 812 GTS e mais. Curadoria premium e entrega nacional. Attra Veículos.',
		keywords: ['comprar ferrari brasil', 'ferrari brasil preço', 'ferrari à venda', 'ferrari seminovo', 'ferrari roma preço'],
		highlights: [
			'Tecnologia direta da Fórmula 1',
			'Motores V8 e V12 — referência em performance',
			'Programa de personalização Tailor Made',
			'Valorização excepcional no mercado de colecionadores',
		],
		models: [
			{
				slug: 'roma',
				name: 'Roma',
				fullName: 'Ferrari Roma',
				tagline: 'Elegância italiana em forma de gran turismo',
				description: 'A Ferrari Roma é o gran turismo mais elegante da nova geração Ferrari. Inspirada na Dolce Vita dos anos 60, combina motor V8 biturbo de 620 cv com um design que é pura arte italiana.',
				metaTitle: 'Ferrari Roma à Venda no Brasil | GT V8 Biturbo',
				metaDescription: 'Comprar Ferrari Roma no Brasil. GT V8 biturbo de 620 cv com design inspirado nos clássicos. Procedência verificada — Attra Veículos.',
				keywords: ['ferrari roma preço brasil', 'comprar ferrari roma', 'ferrari roma seminovo', 'ferrari gt brasil'],
				category: 'gt',
				highlights: ['Motor V8 3.9L biturbo de 620 cv', 'Câmbio de dupla embreagem de 8 velocidades', 'Design premiado — Red Dot Award', 'Tela touchscreen de 16"'],
			},
			{
				slug: 'sf90',
				name: 'SF90 Stradale',
				fullName: 'Ferrari SF90 Stradale',
				tagline: 'O Ferrari mais potente da história',
				description: 'A Ferrari SF90 Stradale é o pináculo da tecnologia Ferrari: 1.000 cv de potência combinando motor V8 biturbo com três motores elétricos. Tecnologia de Fórmula 1 acessível nas ruas.',
				metaTitle: 'Ferrari SF90 Stradale à Venda | 1.000 cv Híbrido',
				metaDescription: 'Comprar Ferrari SF90 Stradale no Brasil. Superesportivo híbrido de 1.000 cv. O Ferrari mais potente já produzido. Attra Veículos.',
				keywords: ['ferrari sf90 preço brasil', 'comprar ferrari sf90', 'ferrari sf90 stradale', 'ferrari híbrido brasil'],
				category: 'supercar',
				highlights: ['1.000 cv — V8 biturbo + 3 motores elétricos', 'Modo eDrive para condução 100% elétrica', '0–100 km/h em 2,5 s', 'Aerodinâmica ativa derivada da F1'],
			},
		],
	},
	{
		slug: 'bmw',
		name: 'BMW',
		displayName: 'BMW',
		country: 'Alemanha',
		tagline: 'O prazer de dirigir desde 1916',
		description: 'A BMW é sinônimo de prazer ao volante. Da linha M de alta performance aos SUVs X que dominam qualquer terreno, cada BMW é projetada para quem valoriza a conexão entre piloto e máquina.',
		metaTitle: 'Comprar BMW no Brasil | BMW Seminovo e 0 km',
		metaDescription: 'BMW à venda no Brasil. M3, X5, X6 e toda linha premium. Procedência verificada, curadoria rigorosa e entrega nacional — Attra Veículos.',
		keywords: ['comprar bmw brasil', 'bmw seminovo brasil', 'bmw premium brasil', 'bmw m sport brasil', 'bmw à venda'],
		highlights: [
			'Linha M — performance de pista para as ruas',
			'xDrive — tração integral inteligente',
			'iDrive — sistema de infoentretenimento referência',
			'Tradição em motores 6 cilindros em linha',
		],
		models: [
			{
				slug: 'm3',
				name: 'M3',
				fullName: 'BMW M3',
				tagline: 'O sedan esportivo definitivo',
				description: 'O BMW M3 é o sedan que faz curva como esportivo. Com motor biturbo de 6 cilindros em linha, tração traseira e suspensão adaptativa, é a referência em performance diária sem compromissos.',
				metaTitle: 'BMW M3 à Venda no Brasil | M3 Competition',
				metaDescription: 'Comprar BMW M3 no Brasil. Sedan esportivo com motor biturbo de até 510 cv. Competition e versões especiais. Attra Veículos — entrega nacional.',
				keywords: ['bmw m3 preço brasil', 'comprar bmw m3', 'bmw m3 competition', 'bmw m3 seminovo', 'bmw m3 comprar'],
				category: 'sedan',
				highlights: ['Motor S58 biturbo 6 cilindros de até 510 cv', 'Câmbio M Steptronic de 8 marchas', 'Diferencial M ativo', 'Modo M personalizado (M1/M2)'],
			},
			{
				slug: 'x5',
				name: 'X5',
				fullName: 'BMW X5',
				tagline: 'O SUV premium que definiu o segmento',
				description: 'O BMW X5 criou o segmento de SUVs premium. Combina presença imponente com dinâmica de condução tipicamente BMW — é o SUV para quem não abre mão de dirigir bem.',
				metaTitle: 'BMW X5 à Venda no Brasil | SUV Premium',
				metaDescription: 'Comprar BMW X5 no Brasil. SUV premium com motor biturbo e tecnologia de ponta. Seminovo e 0 km — Attra Veículos.',
				keywords: ['bmw x5 preço brasil', 'comprar bmw x5', 'bmw x5 seminovo', 'suv bmw brasil'],
				category: 'suv',
				highlights: ['Motor biturbo 6 cilindros ou V8', 'xDrive tração integral inteligente', 'Suspensão pneumática de 2 eixos', 'Porta-malas de até 1.870 L'],
			},
			{
				slug: 'x6',
				name: 'X6',
				fullName: 'BMW X6',
				tagline: 'O SUV coupé que ousou ser diferente',
				description: 'O BMW X6 inventou o conceito de SUV coupé. Com linhas esportivas, teto fastback e performance de sedan, é para quem quer presença na estrada sem abrir mão do estilo.',
				metaTitle: 'BMW X6 à Venda no Brasil | SUV Coupé',
				metaDescription: 'Comprar BMW X6 no Brasil. SUV coupé com design esportivo e motor biturbo. Procedência verificada — Attra Veículos.',
				keywords: ['bmw x6 preço brasil', 'comprar bmw x6', 'bmw x6 seminovo', 'suv coupé bmw brasil'],
				category: 'suv',
				highlights: ['Design coupé com teto fastback', 'Motor biturbo de alto desempenho', 'Faróis Laserlight de 600 m de alcance', 'Interior premium com acabamento em couro Vernasca'],
			},
		],
	},
	{
		slug: 'mercedes-benz',
		name: 'Mercedes-Benz',
		displayName: 'Mercedes-Benz',
		country: 'Alemanha',
		tagline: 'O melhor ou nada',
		description: 'Mercedes-Benz é sinônimo de luxo, segurança e inovação há mais de 130 anos. Da linha AMG de alta performance ao requinte do Classe S, cada Mercedes representa o ápice da engenharia automotiva alemã.',
		metaTitle: 'Comprar Mercedes-Benz no Brasil | Mercedes Seminovo',
		metaDescription: 'Mercedes-Benz à venda no Brasil. AMG GT, G 63, Classe C e toda linha premium. Curadoria rigorosa e entrega nacional — Attra Veículos.',
		keywords: ['comprar mercedes brasil', 'mercedes seminovo brasil', 'mercedes amg brasil', 'mercedes benz à venda', 'mercedes preço brasil'],
		highlights: [
			'AMG — divisão de performance lendária',
			'MBUX — inteligência artificial embarcada',
			'Segurança referência mundial com sistemas PRE-SAFE',
			'Tradição em luxo desde 1886',
		],
		models: [
			{
				slug: 'amg-gt',
				name: 'AMG GT',
				fullName: 'Mercedes-AMG GT',
				tagline: 'Performance pura de Affalterbach',
				description: 'O Mercedes-AMG GT é pura brutalidade refinada. Motor V8 biturbo montado à mão por um único técnico, câmbio de dupla embreagem e uma presença que impõe respeito em qualquer ambiente.',
				metaTitle: 'Mercedes-AMG GT à Venda no Brasil | V8 Biturbo',
				metaDescription: 'Comprar Mercedes-AMG GT no Brasil. Superesportivo V8 biturbo com motor montado à mão. Procedência verificada — Attra Veículos.',
				keywords: ['mercedes amg gt preço brasil', 'comprar amg gt', 'mercedes amg gt seminovo', 'amg gt coupe brasil'],
				category: 'supercar',
				highlights: ['Motor V8 4.0L biturbo montado à mão (One Man, One Engine)', 'Câmbio AMG SPEEDSHIFT DCT 7G', 'Aerodinâmica ativa', 'Diferencial traseiro eletrônico'],
			},
			{
				slug: 'g63-amg',
				name: 'G 63 AMG',
				fullName: 'Mercedes-AMG G 63',
				tagline: 'O ícone que não pede desculpas',
				description: 'O Mercedes G 63 AMG é o SUV mais icônico do mundo. Chassi militar com motor V8 AMG biturbo de 585 cv — domina qualquer terreno sem perder a compostura. De estradas de terra a tapetes vermelhos.',
				metaTitle: 'Mercedes G 63 AMG à Venda no Brasil | SUV V8',
				metaDescription: 'Comprar Mercedes G 63 AMG no Brasil. SUV V8 biturbo de 585 cv com 3 bloqueios de diferencial. Attra Veículos — entrega nacional.',
				keywords: ['mercedes g63 preço brasil', 'comprar g63 amg', 'g wagon brasil', 'mercedes g class preço', 'g63 amg seminovo'],
				category: 'suv',
				highlights: ['Motor V8 4.0L biturbo AMG de 585 cv', '3 bloqueios de diferencial', 'Chassi militar — mais de 40 anos de história', 'Interior de luxo com acabamento Nappa'],
			},
		],
	},
	{
		slug: 'audi',
		name: 'Audi',
		displayName: 'Audi',
		country: 'Alemanha',
		tagline: 'Vorsprung durch Technik — avanço pela tecnologia',
		description: 'Audi é inovação tecnológica em cada detalhe. Da tração Quattro legendária ao cockpit virtual, cada Audi entrega uma experiência de condução que equilibra performance esportiva e conforto de primeiro mundo.',
		metaTitle: 'Comprar Audi no Brasil | Audi Seminovo e 0 km',
		metaDescription: 'Audi à venda no Brasil. RS, R8, Q7 e toda linha premium. Tração Quattro, procedência verificada e entrega nacional — Attra Veículos.',
		keywords: ['comprar audi brasil', 'audi seminovo brasil', 'audi rs brasil', 'audi premium à venda', 'audi preço brasil'],
		highlights: [
			'Quattro — tração integral lendária',
			'Linha RS — performance sem compromisso',
			'Virtual Cockpit — painel digital de referência',
			'Design minimalista e aerodinâmico',
		],
		models: [
			{
				slug: 'r8',
				name: 'R8',
				fullName: 'Audi R8',
				tagline: 'O supercarro do dia a dia',
				description: 'O Audi R8 é o supercarro que você pode usar todos os dias. Motor V10 aspirado compartilhado com o Lamborghini Huracán, tração Quattro permanente e uma sonoridade que arrepia — tudo isso com a praticidade Audi.',
				metaTitle: 'Audi R8 à Venda no Brasil | V10 Quattro',
				metaDescription: 'Comprar Audi R8 no Brasil. Supercarro V10 aspirado com tração Quattro. O último V10 da Audi. Procedência verificada — Attra Veículos.',
				keywords: ['audi r8 preço brasil', 'comprar audi r8', 'audi r8 seminovo', 'audi r8 v10 brasil', 'audi supercar'],
				category: 'supercar',
				highlights: ['Motor V10 5.2L aspirado — som inigualável', 'Tração Quattro integral permanente', 'DNA compartilhado com Lamborghini Huracán', 'Último supercarro V10 aspirado da Audi'],
			},
		],
	},
	{
		slug: 'land-rover',
		name: 'Land Rover',
		displayName: 'Land Rover',
		country: 'Reino Unido',
		tagline: 'Acima e além desde 1948',
		description: 'Land Rover é sinônimo de capacidade off-road e luxo britânico. Do lendário Defender ao refinado Range Rover, cada modelo combina robustez inabalável com elegância que poucas marcas conseguem igualar.',
		metaTitle: 'Comprar Land Rover no Brasil | Range Rover e Defender',
		metaDescription: 'Land Rover à venda no Brasil. Range Rover, Defender, Discovery e mais. Luxo britânico com capacidade off-road. Attra Veículos — entrega nacional.',
		keywords: ['comprar land rover brasil', 'range rover preço brasil', 'land rover seminovo', 'range rover à venda', 'land rover premium brasil'],
		highlights: [
			'Terrain Response — adapta-se a qualquer terreno',
			'Luxo britânico com acabamento artesanal',
			'Suspensão pneumática de longo curso',
			'Heritage de mais de 75 anos em expedições',
		],
		models: [
			{
				slug: 'range-rover',
				name: 'Range Rover',
				fullName: 'Range Rover',
				tagline: 'O SUV de luxo definitivo',
				description: 'O Range Rover é o SUV de luxo que definiu o segmento. Interior com acabamento de Bentley, capacidade off-road de Defender e presença que comanda qualquer ambiente — é a escolha de quem exige o melhor.',
				metaTitle: 'Range Rover à Venda no Brasil | SUV de Luxo',
				metaDescription: 'Comprar Range Rover no Brasil. SUV de luxo com acabamento premium e capacidade off-road. Seminovo e 0 km — Attra Veículos.',
				keywords: ['range rover preço brasil', 'comprar range rover', 'range rover seminovo', 'range rover vogue brasil', 'suv luxo brasil'],
				category: 'suv',
				highlights: ['Interior em couro semi-anilina com 24 ajustes elétricos', 'Suspensão pneumática de 4 cantos', 'Terrain Response 2 automático', 'Isolamento acústico classe S'],
			},
		],
	},
	{
		slug: 'chevrolet',
		name: 'Chevrolet',
		displayName: 'Chevrolet',
		country: 'Estados Unidos',
		tagline: 'Performance americana lendária',
		description: 'A Chevrolet traz o melhor da performance americana para o Brasil. Do Corvette Z06 — o supercarro de motor central mais potente da história — ao Camaro SS, é a marca que prova que potência bruta pode ter refinamento.',
		metaTitle: 'Comprar Chevrolet Premium no Brasil | Corvette e Camaro',
		metaDescription: 'Chevrolet premium à venda no Brasil. Corvette Z06, Camaro e mais. Performance americana com procedência verificada — Attra Veículos.',
		keywords: ['comprar corvette brasil', 'chevrolet premium brasil', 'corvette preço brasil', 'camaro à venda brasil'],
		highlights: [
			'Corvette — motor central V8 aspirado',
			'Tradição em muscle cars e esportivos',
			'Performance excepcional por valor acessível',
			'Cultura car americana autêntica',
		],
		models: [
			{
				slug: 'corvette-z06',
				name: 'Corvette Z06',
				fullName: 'Chevrolet Corvette Z06',
				tagline: 'O V8 aspirado mais potente da história',
				description: 'O Corvette Z06 é a prova de que os americanos sabem fazer supercarro. Motor V8 aspirado de 670 cv derivado de corrida, chassis de motor central e aerodinâmica ativa — tudo por uma fração do preço dos europeus.',
				metaTitle: 'Corvette Z06 à Venda no Brasil | V8 670 cv',
				metaDescription: 'Comprar Corvette Z06 no Brasil. Supercarro V8 aspirado de 670 cv com motor central. O mais potente V8 aspirado da história — Attra Veículos.',
				keywords: ['corvette z06 preço brasil', 'comprar corvette z06', 'corvette z06 seminovo', 'corvette c8 brasil'],
				category: 'supercar',
				highlights: ['Motor LT6 V8 5.5L flat-plane de 670 cv', 'Redline de 8.600 rpm — V8 mais rotativo da história', 'Motor central — equilíbrio perfeito', 'Aerodinâmica que gera 290 kg de downforce'],
			},
		],
	},
	{
		slug: 'mclaren',
		name: 'McLaren',
		displayName: 'McLaren',
		country: 'Reino Unido',
		tagline: 'Engenharia de Fórmula 1 para as ruas',
		description: 'McLaren transfere décadas de vitórias em Fórmula 1 diretamente para seus supercarros de rua. Chassi em fibra de carbono, peso mínimo e uma obsessão por aerodinâmica que nenhum concorrente consegue igualar.',
		metaTitle: 'Comprar McLaren no Brasil | McLaren à Venda',
		metaDescription: 'McLaren à venda no Brasil. Artura, 720S, GT e mais. Supercarros de F1 com procedência verificada. Curadoria premium — Attra Veículos.',
		keywords: ['comprar mclaren brasil', 'mclaren preço brasil', 'mclaren à venda', 'mclaren artura brasil'],
		highlights: [
			'Chassi MonoCell em fibra de carbono',
			'Peso mínimo — filosofia "cada grama conta"',
			'Tecnologia direta da Fórmula 1',
			'Design funcional — cada linha tem propósito aerodinâmico',
		],
		models: [
			{
				slug: 'artura',
				name: 'Artura',
				fullName: 'McLaren Artura',
				tagline: 'O futuro dos supercarros é híbrido',
				description: 'A McLaren Artura é o primeiro supercarro híbrido plug-in da McLaren. Motor V6 biturbo desenvolvido do zero combinado com motor elétrico em um pacote de apenas 1.395 kg — é o futuro da performance.',
				metaTitle: 'McLaren Artura à Venda no Brasil | Híbrido 680 cv',
				metaDescription: 'Comprar McLaren Artura no Brasil. Supercarro híbrido de 680 cv com chassi em fibra de carbono. Primeiro McLaren plug-in — Attra Veículos.',
				keywords: ['mclaren artura preço brasil', 'comprar mclaren artura', 'mclaren híbrido brasil', 'mclaren artura spider'],
				category: 'supercar',
				highlights: ['Motor V6 3.0L biturbo + motor elétrico = 680 cv', 'Chassi MCLA em fibra de carbono', 'Apenas 1.395 kg — levíssimo para um híbrido', 'Modo EV para condução silenciosa'],
			},
		],
	},
]

export function findSEOBrand(slug: string): SEOBrand | undefined {
	return SEO_BRANDS.find(b => b.slug === slug)
}

export function findSEOModel(brandSlug: string, modelSlug: string): { brand: SEOBrand; model: SEOModel } | undefined {
	const brand = findSEOBrand(brandSlug)
	if (!brand) return undefined
	const model = brand.models.find(m => m.slug === modelSlug)
	if (!model) return undefined
	return { brand, model }
}

/** All brand slugs for generateStaticParams */
export function getAllBrandSlugs(): string[] {
	return SEO_BRANDS.map(b => b.slug)
}

/** All brand+model slug pairs for generateStaticParams */
export function getAllModelSlugs(): { brand: string; model: string }[] {
	return SEO_BRANDS.flatMap(b =>
		b.models.map(m => ({ brand: b.slug, model: m.slug }))
	)
}
