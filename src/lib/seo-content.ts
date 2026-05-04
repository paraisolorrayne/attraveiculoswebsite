/**
 * SEO Content — 8 Blocos
 *
 * Estrutura completa de conteúdo SEO para captura de intenção de compra.
 *
 * Bloco 1: Páginas de Modelo (core)
 * Bloco 2: Páginas de Preço
 * Bloco 3: Condição (seminovos / supercarros)
 * Bloco 4: Faixa de Preço
 * Bloco 5: Perfil do Comprador (contexto de uso)
 * Bloco 6: Guias Operacionais (colecionadores)
 * Bloco 7: Confiança (processo, garantia, entrega)
 * Bloco 8: Importação
 */

// ---------------------------------------------------------------------------
// Bloco 1 — Páginas de Modelo
// ---------------------------------------------------------------------------

export interface ModeloPage {
	slug: string
	brand: string
	model: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	resumo: string
	versoes: string[]
	faixaPreco: { novo: string; seminovo: string }
	diferenciais: { label: string; texto: string }[]
	perfilIdeal: string
	quandoNaoComprar: string
	faq: { pergunta: string; resposta: string }[]
	modelosRelacionados: { nome: string; href: string }[]
}

export const MODELOS: ModeloPage[] = [
	{
		slug: 'porsche-911',
		brand: 'Porsche',
		model: '911',
		metaTitle: 'Porsche 911 à Venda no Brasil | Preço e Estoque | Attra Veículos',
		metaDescription: 'Porsche 911 à venda no Brasil com procedência verificada. Confira versões disponíveis, faixa de preço e estoque real. Attra Veículos.',
		keywords: ['porsche 911 à venda', 'comprar porsche 911 brasil', 'porsche 911 preço', 'porsche 911 seminovo'],
		resumo: 'O Porsche 911 é o esportivo de referência para quem busca performance pura com uso diário. Comprado por entusiastas, colecionadores e motoristas que priorizam dirigibilidade acima de tudo.',
		versoes: ['Carrera', 'Carrera S', 'Carrera 4S', 'Turbo', 'Turbo S', 'GT3', 'GT3 RS', 'Targa'],
		faixaPreco: { novo: 'R$ 800 mil a R$ 3,5 milhões', seminovo: 'R$ 500 mil a R$ 2,5 milhões' },
		diferenciais: [
			{ label: 'Performance', texto: 'Motor boxer traseiro com distribuição de peso otimizada. Aceleração de 0 a 100 km/h em menos de 4 segundos nas versões Turbo.' },
			{ label: 'Status', texto: 'Reconhecido globalmente como o esportivo mais icônico do mundo. Silhueta inconfundível que dispensa apresentações.' },
			{ label: 'Uso', texto: 'Um dos poucos supercarros que funciona como carro diário. Porta-malas dianteiro prático, consumo razoável para a categoria.' },
		],
		perfilIdeal: 'Entusiasta que quer performance real no dia a dia. Pessoas que valorizam engenharia, tradição esportiva e precisão mecânica. Ideal para quem busca um carro que entrega emoção na pista e conforto na cidade.',
		quandoNaoComprar: 'Se a prioridade é espaço interno ou conforto de passageiros traseiros. Não é a escolha certa para quem precisa de um carro familiar ou quer apenas status visual sem interesse em dirigibilidade.',
		faq: [
			{ pergunta: 'Qual o preço do Porsche 911 no Brasil?', resposta: 'O Porsche 911 seminovo parte de aproximadamente R$ 500 mil para versões Carrera mais antigas e pode ultrapassar R$ 2,5 milhões em versões GT3 RS ou Turbo S recentes. Novos, os preços começam em R$ 800 mil.' },
			{ pergunta: 'A manutenção do 911 é cara?', resposta: 'Revisões periódicas custam entre R$ 3 mil e R$ 8 mil dependendo da versão. Peças de desgaste como pastilhas e discos podem ser mais caras nas versões cerâmicas. O custo é compatível com a categoria de esportivos premium.' },
			{ pergunta: 'O 911 é um bom carro para uso diário?', resposta: 'Sim. É um dos esportivos mais adaptados ao uso diário do mercado. Possui porta-malas funcional, visibilidade adequada e modos de condução que equilibram conforto e performance.' },
			{ pergunta: 'A Attra entrega o 911 em todo o Brasil?', resposta: 'Sim. A Attra realiza entrega em caminhão fechado com seguro completo e rastreamento em tempo real para todo o território nacional.' },
		],
		modelosRelacionados: [
			{ nome: 'BMW M3', href: '/comprar/modelo/bmw-m3' },
			{ nome: 'Mercedes C63 AMG', href: '/comprar/modelo/mercedes-c63-amg' },
			{ nome: 'Porsche Cayenne', href: '/comprar/modelo/porsche-cayenne' },
		],
	},
	{
		slug: 'bmw-m3',
		brand: 'BMW',
		model: 'M3',
		metaTitle: 'BMW M3 à Venda no Brasil | Preço e Estoque | Attra Veículos',
		metaDescription: 'BMW M3 à venda no Brasil com procedência verificada. Confira versões, faixa de preço e estoque real. Attra Veículos.',
		keywords: ['bmw m3 à venda', 'comprar bmw m3 brasil', 'bmw m3 preço', 'bmw m3 seminovo'],
		resumo: 'O BMW M3 é referência entre sedans esportivos. Projetado para quem quer performance de pista com a praticidade de um sedan premium no dia a dia.',
		versoes: ['M3 Standard', 'M3 Competition', 'M3 Competition xDrive', 'M3 CS'],
		faixaPreco: { novo: 'R$ 700 mil a R$ 1,2 milhão', seminovo: 'R$ 400 mil a R$ 900 mil' },
		diferenciais: [
			{ label: 'Performance', texto: 'Motor S58 de 6 cilindros em linha biturbo com até 550 cv na versão CS. Resposta linear e progressiva, ideal para condução esportiva.' },
			{ label: 'Status', texto: 'Ícone do segmento M da BMW. Reconhecido mundialmente como um dos melhores sedans esportivos já produzidos.' },
			{ label: 'Uso', texto: 'Sedan de 4 portas com espaço para passageiros e bagagem. Funciona perfeitamente como carro principal com performance de pista.' },
		],
		perfilIdeal: 'Motorista que busca precisão de condução e feedback mecânico em um pacote funcional. Ideal para quem precisa de 4 portas sem abrir mão de performance real.',
		quandoNaoComprar: 'Se você prioriza conforto de rodagem acima de tudo. A suspensão firme e o foco esportivo podem incomodar em deslocamentos longos no dia a dia urbano.',
		faq: [
			{ pergunta: 'Qual o preço do BMW M3 no Brasil?', resposta: 'Seminovos partem de cerca de R$ 400 mil para gerações anteriores (F80) e podem chegar a R$ 900 mil para versões Competition ou CS da geração atual (G80). Novos, os preços começam em R$ 700 mil.' },
			{ pergunta: 'O M3 é confiável?', resposta: 'Sim. O motor S58 é considerado robusto e confiável desde que as revisões sejam feitas na rede autorizada. A manutenção preventiva é essencial para longevidade.' },
			{ pergunta: 'M3 Competition ou M3 CS?', resposta: 'O Competition é a versão mais equilibrada para uso misto. O CS é focado em pista com menos conforto, peso reduzido e potência superior. Para uso diário, o Competition é mais indicado.' },
			{ pergunta: 'A Attra entrega o M3 em todo o Brasil?', resposta: 'Sim. Entrega especializada em caminhão fechado com seguro completo para todo o território nacional.' },
		],
		modelosRelacionados: [
			{ nome: 'Mercedes C63 AMG', href: '/comprar/modelo/mercedes-c63-amg' },
			{ nome: 'Audi RS6', href: '/comprar/modelo/audi-rs6' },
			{ nome: 'Porsche 911', href: '/comprar/modelo/porsche-911' },
		],
	},
	{
		slug: 'mercedes-c63-amg',
		brand: 'Mercedes-Benz',
		model: 'C63 AMG',
		metaTitle: 'Mercedes C63 AMG à Venda no Brasil | Preço e Estoque | Attra Veículos',
		metaDescription: 'Mercedes C63 AMG à venda no Brasil. V8 biturbo, performance e luxo. Confira preço, versões e estoque real. Attra Veículos.',
		keywords: ['mercedes c63 amg à venda', 'comprar c63 amg brasil', 'mercedes c63 preço', 'c63 amg seminovo'],
		resumo: 'O Mercedes-AMG C 63 combina brutalidade mecânica com luxo refinado. Escolhido por quem quer um sedan esportivo com presença imponente e interior premium.',
		versoes: ['C 63', 'C 63 S', 'C 63 S Coupé', 'C 63 S E Performance'],
		faixaPreco: { novo: 'R$ 800 mil a R$ 1,3 milhão', seminovo: 'R$ 350 mil a R$ 800 mil' },
		diferenciais: [
			{ label: 'Performance', texto: 'Motor V8 4.0L biturbo com até 510 cv nas versões S (geração W205). Torque brutal disponível desde baixas rotações, entregando aceleração visceral.' },
			{ label: 'Status', texto: 'O selo AMG é sinônimo de exclusividade. Presença de rua inigualável entre sedans esportivos, com sonoridade que o diferencia de qualquer concorrente.' },
			{ label: 'Uso', texto: 'Interior Mercedes com acabamento superior. Conforto para viagens longas com a capacidade de ser agressivo quando exigido.' },
		],
		perfilIdeal: 'Quem busca experiência sensorial completa: ronco de V8, interior luxuoso e presença marcante. Ideal para motoristas que valorizam a combinação de potência bruta com refinamento.',
		quandoNaoComprar: 'Se pureza de condução e feedback de volante são prioridade absoluta. O C63 é mais pesado e menos comunicativo que rivais focados em pista. A nova geração com 4 cilindros híbrido também divide opiniões entre puristas.',
		faq: [
			{ pergunta: 'Qual o preço do C63 AMG no Brasil?', resposta: 'Versões V8 seminovas (W205) partem de R$ 350 mil. Modelos mais recentes e versões S podem chegar a R$ 800 mil. A nova geração híbrida (W206) tem preços a partir de R$ 800 mil.' },
			{ pergunta: 'O V8 do C63 vai acabar?', resposta: 'A geração W206 já utiliza motor 4 cilindros híbrido. Porém, as versões V8 (W205) continuam sendo as mais procuradas no mercado de seminovos pela sonoridade e caráter único.' },
			{ pergunta: 'C63 AMG ou BMW M3?', resposta: 'O M3 oferece condução mais pura e comunicativa. O C63 entrega experiência mais visceral com o V8 e interior mais luxuoso. A escolha depende do perfil do motorista.' },
			{ pergunta: 'A Attra entrega o C63 em todo o Brasil?', resposta: 'Sim. Entrega em caminhão fechado com seguro completo e rastreamento para todo o país.' },
		],
		modelosRelacionados: [
			{ nome: 'BMW M3', href: '/comprar/modelo/bmw-m3' },
			{ nome: 'Audi RS6', href: '/comprar/modelo/audi-rs6' },
			{ nome: 'Mercedes GLE', href: '/comprar/modelo/mercedes-gle' },
		],
	},
	{
		slug: 'audi-rs6',
		brand: 'Audi',
		model: 'RS6',
		metaTitle: 'Audi RS6 à Venda no Brasil | Preço e Estoque | Attra Veículos',
		metaDescription: 'Audi RS6 Avant à venda no Brasil. Performance de superesportivo em formato perua. Preço, versões e estoque real. Attra Veículos.',
		keywords: ['audi rs6 à venda', 'comprar audi rs6 brasil', 'audi rs6 preço', 'rs6 avant seminovo'],
		resumo: 'O Audi RS6 Avant é a perua mais rápida do mundo. Projetado para quem recusa compromissos entre performance extrema e praticidade no dia a dia.',
		versoes: ['RS6 Avant', 'RS6 Avant Performance'],
		faixaPreco: { novo: 'R$ 1 milhão a R$ 1,5 milhão', seminovo: 'R$ 700 mil a R$ 1,2 milhão' },
		diferenciais: [
			{ label: 'Performance', texto: 'Motor V8 4.0L biturbo com 600 cv e tração Quattro. Aceleração de 0 a 100 km/h em 3,6 segundos em formato perua.' },
			{ label: 'Status', texto: 'Discretamente brutal. Visualmente uma perua elegante que esconde performance de superesportivo. O carro de quem entende sem precisar ostentar.' },
			{ label: 'Uso', texto: 'Espaço interno generoso, porta-malas de 565 litros e conforto de viagem. Funciona como carro familiar com capacidade de ultrapassar supercarros.' },
		],
		perfilIdeal: 'Entusiasta prático. Quem quer levar a família e a bagagem sem abrir mão de 600 cv e aceleração de superesportivo. Ideal para viagens longas com performance sob demanda.',
		quandoNaoComprar: 'Se o objetivo é um carro compacto para uso urbano. O RS6 é grande e pesado, com consumo elevado. Não é a escolha para quem busca economia ou agilidade em espaços apertados.',
		faq: [
			{ pergunta: 'Qual o preço do Audi RS6 no Brasil?', resposta: 'Seminovos partem de R$ 700 mil e podem ultrapassar R$ 1,2 milhão para versões Performance com poucos quilômetros. Novos, o RS6 Avant começa em R$ 1 milhão.' },
			{ pergunta: 'O RS6 serve como carro de família?', resposta: 'Perfeitamente. Possui 5 lugares confortáveis, porta-malas generoso e modos de condução que o transformam de uma perua confortável a um superesportivo em segundos.' },
			{ pergunta: 'Manutenção do RS6 é cara?', resposta: 'Compatível com a categoria. Revisões na rede autorizada Audi custam entre R$ 5 mil e R$ 12 mil. O motor V8 biturbo requer atenção ao óleo e sistema de refrigeração.' },
			{ pergunta: 'A Attra entrega o RS6 em todo o Brasil?', resposta: 'Sim. Entrega nacional em caminhão fechado com seguro completo.' },
		],
		modelosRelacionados: [
			{ nome: 'BMW M3', href: '/comprar/modelo/bmw-m3' },
			{ nome: 'Mercedes C63 AMG', href: '/comprar/modelo/mercedes-c63-amg' },
			{ nome: 'Audi Q8', href: '/comprar/modelo/audi-q8' },
		],
	},
	{
		slug: 'porsche-cayenne',
		brand: 'Porsche',
		model: 'Cayenne',
		metaTitle: 'Porsche Cayenne à Venda no Brasil | Preço e Estoque | Attra Veículos',
		metaDescription: 'Porsche Cayenne à venda no Brasil. SUV premium com DNA esportivo. Preço, versões e estoque real. Attra Veículos.',
		keywords: ['porsche cayenne à venda', 'comprar porsche cayenne brasil', 'cayenne preço', 'cayenne seminovo'],
		resumo: 'O Porsche Cayenne é o SUV que trouxe performance esportiva para o segmento de utilitários premium. Comprado por quem quer versatilidade sem abrir mão do DNA Porsche.',
		versoes: ['Cayenne', 'Cayenne S', 'Cayenne GTS', 'Cayenne Turbo', 'Cayenne Turbo GT', 'Cayenne E-Hybrid'],
		faixaPreco: { novo: 'R$ 600 mil a R$ 1,8 milhão', seminovo: 'R$ 350 mil a R$ 1,3 milhão' },
		diferenciais: [
			{ label: 'Performance', texto: 'Chassis derivado do 911 com suspensão adaptativa. Versão Turbo GT com 640 cv é o SUV mais rápido do Nürburgring.' },
			{ label: 'Status', texto: 'O SUV premium que definiu a categoria. Silhueta Porsche inconfundível com presença e funcionalidade.' },
			{ label: 'Uso', texto: 'Espaço para 5 ocupantes, porta-malas generoso e capacidade off-road real. Funciona para família, viagens e lazer.' },
		],
		perfilIdeal: 'Quem precisa de espaço e versatilidade de SUV com a dirigibilidade Porsche. Ideal para famílias que não abrem mão de performance e querem um carro completo para todas as situações.',
		quandoNaoComprar: 'Se o foco é exclusivamente performance pura de esportivo. Apesar de rápido, o Cayenne nunca vai oferecer a mesma conexão com a estrada que um 911 ou Cayman.',
		faq: [
			{ pergunta: 'Qual o preço do Porsche Cayenne no Brasil?', resposta: 'Seminovos partem de R$ 350 mil para versões base e chegam a R$ 1,3 milhão para Turbo GT. Novos começam em R$ 600 mil.' },
			{ pergunta: 'Cayenne ou Range Rover?', resposta: 'O Cayenne é mais esportivo e dinâmico. O Range Rover prioriza conforto e presença. Para quem valoriza dirigibilidade, o Cayenne é a escolha.' },
			{ pergunta: 'Cayenne diesel ou gasolina?', resposta: 'No Brasil, a maioria das versões disponíveis é gasolina ou híbrida. O diesel era oferecido em gerações anteriores e pode ser encontrado no mercado de seminovos.' },
			{ pergunta: 'A Attra entrega o Cayenne em todo o Brasil?', resposta: 'Sim. Entrega nacional especializada com seguro completo.' },
		],
		modelosRelacionados: [
			{ nome: 'BMW X5', href: '/comprar/modelo/bmw-x5' },
			{ nome: 'Audi Q8', href: '/comprar/modelo/audi-q8' },
			{ nome: 'Range Rover Sport', href: '/comprar/modelo/range-rover-sport' },
		],
	},
	{
		slug: 'porsche-macan',
		brand: 'Porsche',
		model: 'Macan',
		metaTitle: 'Porsche Macan à Venda no Brasil | Preço e Estoque | Attra Veículos',
		metaDescription: 'Porsche Macan à venda no Brasil. SUV compacto com DNA esportivo Porsche. Preço, versões e estoque. Attra Veículos.',
		keywords: ['porsche macan à venda', 'comprar porsche macan brasil', 'macan preço', 'macan seminovo'],
		resumo: 'O Porsche Macan é o SUV compacto premium mais esportivo do mercado. A porta de entrada para o universo Porsche com praticidade urbana e performance real.',
		versoes: ['Macan', 'Macan S', 'Macan GTS', 'Macan Turbo'],
		faixaPreco: { novo: 'R$ 450 mil a R$ 800 mil', seminovo: 'R$ 250 mil a R$ 600 mil' },
		diferenciais: [
			{ label: 'Performance', texto: 'Plataforma compartilhada com o Audi Q5 mas com chassi Porsche exclusivo. Versão GTS com motor V6 biturbo oferece experiência de condução referência na categoria.' },
			{ label: 'Status', texto: 'Porsche acessível que mantém o DNA da marca. Design compacto e elegante que funciona em qualquer contexto.' },
			{ label: 'Uso', texto: 'Tamanho ideal para uso urbano. Fácil de manobrar e estacionar sem perder a versatilidade de um SUV.' },
		],
		perfilIdeal: 'Quem busca um SUV compacto premium com dirigibilidade esportiva. Ideal para uso urbano diário, sendo a escolha mais popular entre mulheres que buscam conforto, segurança e elegância.',
		quandoNaoComprar: 'Se precisa de muito espaço para passageiros traseiros ou bagagem volumosa. O Macan é compacto e prioriza a experiência do motorista sobre o espaço interno.',
		faq: [
			{ pergunta: 'Qual o preço do Porsche Macan no Brasil?', resposta: 'Seminovos partem de R$ 250 mil e chegam a R$ 600 mil para versões Turbo recentes. Novos começam em R$ 450 mil.' },
			{ pergunta: 'Macan ou Cayenne?', resposta: 'O Macan é mais compacto, ágil e acessível. O Cayenne oferece mais espaço e versões mais potentes. Para uso urbano, o Macan é mais prático.' },
			{ pergunta: 'O Macan elétrico já está disponível?', resposta: 'O Macan elétrico foi lançado globalmente e começa a chegar ao Brasil. Confira disponibilidade no nosso estoque.' },
			{ pergunta: 'A Attra entrega o Macan em todo o Brasil?', resposta: 'Sim. Entrega nacional em caminhão fechado com seguro completo.' },
		],
		modelosRelacionados: [
			{ nome: 'Audi Q5', href: '/comprar/modelo/audi-q5' },
			{ nome: 'BMW X3', href: '/comprar/modelo/bmw-x3' },
			{ nome: 'Porsche Cayenne', href: '/comprar/modelo/porsche-cayenne' },
		],
	},
	{
		slug: 'bmw-x5',
		brand: 'BMW',
		model: 'X5',
		metaTitle: 'BMW X5 à Venda no Brasil | Preço e Estoque | Attra Veículos',
		metaDescription: 'BMW X5 à venda no Brasil. SUV premium com equilíbrio entre performance e conforto. Preço, versões e estoque. Attra Veículos.',
		keywords: ['bmw x5 à venda', 'comprar bmw x5 brasil', 'bmw x5 preço', 'bmw x5 seminovo'],
		resumo: 'O BMW X5 é o SUV premium que equilibra performance esportiva com conforto familiar. Referência na categoria por dirigibilidade e tecnologia embarcada.',
		versoes: ['X5 xDrive40i', 'X5 xDrive45e', 'X5 M50i', 'X5 M Competition'],
		faixaPreco: { novo: 'R$ 600 mil a R$ 1,2 milhão', seminovo: 'R$ 300 mil a R$ 900 mil' },
		diferenciais: [
			{ label: 'Performance', texto: 'Motor 6 cilindros em linha turbo com até 530 cv na versão M50i. Tração integral xDrive com distribuição variável de torque.' },
			{ label: 'Status', texto: 'Um dos SUVs premium mais vendidos globalmente. Combinação de sofisticação e esportividade que define a identidade BMW.' },
			{ label: 'Uso', texto: 'Espaço interno generoso com terceira fileira opcional. Porta-malas amplo e conforto de rodagem para viagens longas.' },
		],
		perfilIdeal: 'Executivos e famílias que precisam de espaço sem abrir mão de performance. O X5 é a escolha para quem quer um SUV completo que entrega tanto na cidade quanto na estrada.',
		quandoNaoComprar: 'Se busca exclusividade extrema ou presença off-road radical. O X5 é eficiente em quase tudo, mas não se destaca em nenhum extremo.',
		faq: [
			{ pergunta: 'Qual o preço do BMW X5 no Brasil?', resposta: 'Seminovos partem de R$ 300 mil e podem chegar a R$ 900 mil para versões M Competition. Novos começam em R$ 600 mil.' },
			{ pergunta: 'X5 ou X6?', resposta: 'O X5 oferece mais espaço interno e praticidade. O X6 prioriza design coupé com perfil mais esportivo. Para famílias, o X5 é mais funcional.' },
			{ pergunta: 'O X5 híbrido vale a pena?', resposta: 'O X5 xDrive45e oferece autonomia elétrica de até 80 km, ideal para uso urbano. Combina economia no dia a dia com performance quando necessário.' },
			{ pergunta: 'A Attra entrega o X5 em todo o Brasil?', resposta: 'Sim. Entrega em caminhão fechado com seguro completo para todo o território nacional.' },
		],
		modelosRelacionados: [
			{ nome: 'Porsche Cayenne', href: '/comprar/modelo/porsche-cayenne' },
			{ nome: 'Mercedes GLE', href: '/comprar/modelo/mercedes-gle' },
			{ nome: 'Audi Q7', href: '/comprar/modelo/audi-q7' },
		],
	},
	{
		slug: 'bmw-x6',
		brand: 'BMW',
		model: 'X6',
		metaTitle: 'BMW X6 à Venda no Brasil | Preço e Estoque | Attra Veículos',
		metaDescription: 'BMW X6 à venda no Brasil. SUV coupé com design arrojado e performance. Preço, versões e estoque real. Attra Veículos.',
		keywords: ['bmw x6 à venda', 'comprar bmw x6 brasil', 'bmw x6 preço', 'bmw x6 seminovo'],
		resumo: 'O BMW X6 é o SUV coupé que criou a categoria. Design provocativo com performance de sedan esportivo em formato utilitário.',
		versoes: ['X6 xDrive40i', 'X6 M50i', 'X6 M Competition'],
		faixaPreco: { novo: 'R$ 650 mil a R$ 1,3 milhão', seminovo: 'R$ 350 mil a R$ 1 milhão' },
		diferenciais: [
			{ label: 'Performance', texto: 'Mesma base mecânica do X5 com centro de gravidade mais baixo pelo teto fastback. Sensação de condução mais conectada que um SUV tradicional.' },
			{ label: 'Status', texto: 'Design coupé arrojado que se destaca no trânsito. Escolha para quem quer impacto visual com praticidade de SUV.' },
			{ label: 'Uso', texto: 'Conforto de SUV com perfil esportivo. Porta-malas menor que o X5 pelo design, mas ainda funcional para uso diário.' },
		],
		perfilIdeal: 'Quem prioriza design e presença visual em um SUV. Ideal para motoristas que dispensam o espaço máximo em favor de uma silhueta mais expressiva e dinâmica.',
		quandoNaoComprar: 'Se precisa de máximo espaço interno e praticidade. O teto inclinado reduz o espaço traseiro e o porta-malas em comparação ao X5.',
		faq: [
			{ pergunta: 'Qual o preço do BMW X6 no Brasil?', resposta: 'Seminovos partem de R$ 350 mil e chegam a R$ 1 milhão para versões M Competition. Novos começam em R$ 650 mil.' },
			{ pergunta: 'X6 ou X5?', resposta: 'O X6 é para quem prioriza design e esportividade. O X5 para quem prioriza espaço e funcionalidade. Mecanicamente, compartilham a mesma base.' },
			{ pergunta: 'O X6 é confortável?', resposta: 'Sim. Apesar do perfil coupé, o X6 mantém o conforto de rodagem BMW. Apenas passageiros mais altos podem notar diferença no espaço traseiro.' },
			{ pergunta: 'A Attra entrega o X6 em todo o Brasil?', resposta: 'Sim. Entrega nacional especializada com seguro completo.' },
		],
		modelosRelacionados: [
			{ nome: 'BMW X5', href: '/comprar/modelo/bmw-x5' },
			{ nome: 'Porsche Cayenne', href: '/comprar/modelo/porsche-cayenne' },
			{ nome: 'Mercedes GLE', href: '/comprar/modelo/mercedes-gle' },
		],
	},
	{
		slug: 'audi-q7',
		brand: 'Audi',
		model: 'Q7',
		metaTitle: 'Audi Q7 à Venda no Brasil | Preço e Estoque | Attra Veículos',
		metaDescription: 'Audi Q7 à venda no Brasil. SUV de 7 lugares com tecnologia Quattro. Preço, versões e estoque. Attra Veículos.',
		keywords: ['audi q7 à venda', 'comprar audi q7 brasil', 'audi q7 preço', 'audi q7 seminovo'],
		resumo: 'O Audi Q7 é o SUV de grande porte da Audi com 7 lugares reais e tecnologia Quattro. A escolha para famílias que precisam de espaço, conforto e segurança em um pacote premium.',
		versoes: ['Q7 45 TFSI', 'Q7 55 TFSI', 'SQ7'],
		faixaPreco: { novo: 'R$ 500 mil a R$ 900 mil', seminovo: 'R$ 250 mil a R$ 700 mil' },
		diferenciais: [
			{ label: 'Performance', texto: 'Tração integral Quattro com suspensão pneumática. Motor V6 3.0L turbo que entrega potência suave e eficiente para um SUV deste porte.' },
			{ label: 'Status', texto: 'Design sóbrio e elegante. Presença discreta que transmite sofisticação sem ostentação.' },
			{ label: 'Uso', texto: '7 lugares reais com terceira fileira funcional para adultos. Porta-malas de até 890 litros. Ideal para famílias grandes ou viagens com grupo.' },
		],
		perfilIdeal: 'Famílias que precisam de espaço para 7 pessoas com conforto premium. Ideal para viagens longas, golfe no fim de semana ou transporte diário de família com conforto garantido.',
		quandoNaoComprar: 'Se você dirige sozinho na maioria do tempo e não precisa de espaço extra. O Q7 é grande e consome mais que SUVs menores da mesma marca.',
		faq: [
			{ pergunta: 'Qual o preço do Audi Q7 no Brasil?', resposta: 'Seminovos partem de R$ 250 mil e chegam a R$ 700 mil para versões SQ7 recentes. Novos começam em R$ 500 mil.' },
			{ pergunta: 'A terceira fileira do Q7 é funcional?', resposta: 'Sim. Diferente de muitos concorrentes, a terceira fileira do Q7 acomoda adultos com razoável conforto, não apenas crianças.' },
			{ pergunta: 'Q7 ou Q8?', resposta: 'O Q7 oferece mais espaço e 7 lugares. O Q8 tem design coupé mais esportivo com 5 lugares. Para famílias, o Q7 é mais funcional.' },
			{ pergunta: 'A Attra entrega o Q7 em todo o Brasil?', resposta: 'Sim. Entrega nacional em caminhão fechado com seguro completo.' },
		],
		modelosRelacionados: [
			{ nome: 'BMW X5', href: '/comprar/modelo/bmw-x5' },
			{ nome: 'Mercedes GLE', href: '/comprar/modelo/mercedes-gle' },
			{ nome: 'Range Rover Sport', href: '/comprar/modelo/range-rover-sport' },
		],
	},
	{
		slug: 'audi-q8',
		brand: 'Audi',
		model: 'Q8',
		metaTitle: 'Audi Q8 à Venda no Brasil | Preço e Estoque | Attra Veículos',
		metaDescription: 'Audi Q8 à venda no Brasil. SUV coupé de luxo com tecnologia e design premium. Preço, versões e estoque. Attra Veículos.',
		keywords: ['audi q8 à venda', 'comprar audi q8 brasil', 'audi q8 preço', 'audi q8 seminovo'],
		resumo: 'O Audi Q8 é o topo de linha dos SUVs Audi. Design coupé com interior de referência em tecnologia e qualidade de acabamento.',
		versoes: ['Q8 55 TFSI', 'SQ8', 'RS Q8'],
		faixaPreco: { novo: 'R$ 700 mil a R$ 1,5 milhão', seminovo: 'R$ 400 mil a R$ 1,2 milhão' },
		diferenciais: [
			{ label: 'Performance', texto: 'Versão RS Q8 com motor V8 4.0L biturbo de 600 cv. Recordista do Nürburgring para SUVs. Tração Quattro e suspensão adaptativa de série.' },
			{ label: 'Status', texto: 'Topo da gama Audi com design Singleframe imponente. Combina luxo e esportividade em um pacote exclusivo.' },
			{ label: 'Uso', texto: 'Interior com dupla tela tátil e Virtual Cockpit. Conforto de primeiro nível para 5 ocupantes com porta-malas generoso.' },
		],
		perfilIdeal: 'Executivos que querem o melhor da Audi em formato SUV. Ideal para quem busca tecnologia de ponta, conforto supremo e design que se diferencia no segmento.',
		quandoNaoComprar: 'Se precisa de 7 lugares, o Q7 é a escolha. O Q8 sacrifica espaço da terceira fileira pelo design coupé.',
		faq: [
			{ pergunta: 'Qual o preço do Audi Q8 no Brasil?', resposta: 'Seminovos partem de R$ 400 mil e chegam a R$ 1,2 milhão para versões RS Q8. Novos começam em R$ 700 mil.' },
			{ pergunta: 'RS Q8 ou Cayenne Turbo?', resposta: 'O RS Q8 tem mais tecnologia embarcada e interior mais moderno. O Cayenne Turbo tem chassis mais esportivo e melhor feedback de condução. Ambos entregam performance excepcional.' },
			{ pergunta: 'O Q8 é confortável para viagens?', resposta: 'Extremamente. Suspensão pneumática, isolamento acústico e bancos multicontorno fazem dele um dos SUVs mais confortáveis do mercado.' },
			{ pergunta: 'A Attra entrega o Q8 em todo o Brasil?', resposta: 'Sim. Entrega especializada nacional com seguro completo.' },
		],
		modelosRelacionados: [
			{ nome: 'Porsche Cayenne', href: '/comprar/modelo/porsche-cayenne' },
			{ nome: 'BMW X6', href: '/comprar/modelo/bmw-x6' },
			{ nome: 'Range Rover Sport', href: '/comprar/modelo/range-rover-sport' },
		],
	},
	{
		slug: 'range-rover-sport',
		brand: 'Land Rover',
		model: 'Range Rover Sport',
		metaTitle: 'Range Rover Sport à Venda no Brasil | Preço e Estoque | Attra Veículos',
		metaDescription: 'Range Rover Sport à venda no Brasil. SUV esportivo de luxo com capacidade off-road. Preço, versões e estoque. Attra Veículos.',
		keywords: ['range rover sport à venda', 'comprar range rover sport brasil', 'range rover sport preço', 'range rover sport seminovo'],
		resumo: 'O Range Rover Sport combina luxo britânico com capacidade off-road real e performance esportiva. Escolha para quem quer presença, conforto e versatilidade total.',
		versoes: ['Sport P360', 'Sport P400', 'Sport P530', 'Sport SVR'],
		faixaPreco: { novo: 'R$ 700 mil a R$ 1,5 milhão', seminovo: 'R$ 350 mil a R$ 1,2 milhão' },
		diferenciais: [
			{ label: 'Performance', texto: 'Versão SVR com motor V8 5.0L supercharged de 575 cv. Suspensão pneumática com ajuste de altura para asfalto e off-road.' },
			{ label: 'Status', texto: 'Ícone de luxo esportivo britânico. Presença de rua inconfundível que transmite poder e sofisticação.' },
			{ label: 'Uso', texto: 'Conforto de Range Rover com perfil mais dinâmico. Capacidade real de off-road mantida com performance de estrada superior.' },
		],
		perfilIdeal: 'Quem busca presença marcante com versatilidade total. Ideal para uso em fazendas, golfe e estrada sem abrir mão de luxo e performance no asfalto.',
		quandoNaoComprar: 'Se busca economia de manutenção e consumo. Range Rover Sport tem custo de propriedade elevado e pode ter questões de confiabilidade eletrônica em modelos mais antigos.',
		faq: [
			{ pergunta: 'Qual o preço do Range Rover Sport no Brasil?', resposta: 'Seminovos partem de R$ 350 mil e chegam a R$ 1,2 milhão para versões SVR. Novos começam em R$ 700 mil.' },
			{ pergunta: 'Range Rover Sport ou Cayenne?', resposta: 'O Cayenne é mais esportivo no asfalto. O Range Rover Sport oferece melhor capacidade off-road e interior mais luxuoso. Depende do uso prioritário.' },
			{ pergunta: 'O Range Rover Sport é confiável?', resposta: 'A nova geração melhorou significativamente em confiabilidade. Recomenda-se manutenção preventiva rigorosa e preferir veículos com histórico completo de revisões.' },
			{ pergunta: 'A Attra entrega o Range Rover Sport em todo o Brasil?', resposta: 'Sim. Entrega nacional em caminhão fechado com seguro completo.' },
		],
		modelosRelacionados: [
			{ nome: 'Porsche Cayenne', href: '/comprar/modelo/porsche-cayenne' },
			{ nome: 'Land Rover Defender', href: '/comprar/modelo/land-rover-defender' },
			{ nome: 'BMW X5', href: '/comprar/modelo/bmw-x5' },
		],
	},
	{
		slug: 'land-rover-defender',
		brand: 'Land Rover',
		model: 'Defender',
		metaTitle: 'Land Rover Defender à Venda no Brasil | Preço e Estoque | Attra Veículos',
		metaDescription: 'Land Rover Defender à venda no Brasil. Ícone off-road com design moderno. Preço, versões e estoque real. Attra Veículos.',
		keywords: ['land rover defender à venda', 'comprar defender brasil', 'defender preço', 'defender seminovo'],
		resumo: 'O Land Rover Defender é o veículo off-road mais icônico do mundo, agora com tecnologia moderna e conforto premium. Projetado para quem recusa limites geográficos.',
		versoes: ['Defender 90', 'Defender 110', 'Defender 130', 'Defender V8'],
		faixaPreco: { novo: 'R$ 500 mil a R$ 1,2 milhão', seminovo: 'R$ 350 mil a R$ 1 milhão' },
		diferenciais: [
			{ label: 'Performance', texto: 'Versão V8 com 525 cv sobre plataforma off-road. Chassi monobloco com geometria específica para terrenos extremos e ângulos de ataque superiores.' },
			{ label: 'Status', texto: 'Ícone global de aventura e robustez. Design que comunica personalidade forte e independência.' },
			{ label: 'Uso', texto: 'Capacidade off-road real que poucos veículos igualam. Disponível em 3 comprimentos (90, 110, 130) para diferentes necessidades.' },
		],
		perfilIdeal: 'Aventureiros e proprietários rurais que precisam de capacidade off-road real. Também para quem valoriza o estilo robusto e a personalidade única do Defender na cidade.',
		quandoNaoComprar: 'Se busca conforto de rodagem refinado no asfalto. O Defender prioriza robustez sobre suavidade. Para estrada, um Range Rover Sport é mais confortável.',
		faq: [
			{ pergunta: 'Qual o preço do Defender no Brasil?', resposta: 'Seminovos partem de R$ 350 mil e chegam a R$ 1 milhão para versões V8 ou 130. Novos começam em R$ 500 mil.' },
			{ pergunta: 'Defender 90 ou 110?', resposta: 'O 90 é mais compacto e ágil, ideal para uso urbano e trilhas. O 110 oferece mais espaço para família e bagagem. O 130 tem a maior capacidade de carga e 8 lugares.' },
			{ pergunta: 'O Defender novo é bom como o antigo?', resposta: 'O novo Defender combina a capacidade off-road lendária com tecnologia e conforto modernos. É superior em quase todos os aspectos técnicos ao modelo anterior.' },
			{ pergunta: 'A Attra entrega o Defender em todo o Brasil?', resposta: 'Sim. Entrega nacional em caminhão fechado com seguro completo.' },
		],
		modelosRelacionados: [
			{ nome: 'Range Rover Sport', href: '/comprar/modelo/range-rover-sport' },
			{ nome: 'BMW X5', href: '/comprar/modelo/bmw-x5' },
			{ nome: 'Porsche Cayenne', href: '/comprar/modelo/porsche-cayenne' },
		],
	},
	{
		slug: 'mercedes-gle',
		brand: 'Mercedes-Benz',
		model: 'GLE',
		metaTitle: 'Mercedes GLE à Venda no Brasil | Preço e Estoque | Attra Veículos',
		metaDescription: 'Mercedes GLE à venda no Brasil. SUV premium com conforto e tecnologia de referência. Preço, versões e estoque. Attra Veículos.',
		keywords: ['mercedes gle à venda', 'comprar mercedes gle brasil', 'mercedes gle preço', 'gle seminovo'],
		resumo: 'O Mercedes-Benz GLE é o SUV premium que prioriza conforto e refinamento acima de tudo. A escolha para quem busca o interior mais luxuoso da categoria.',
		versoes: ['GLE 300 d', 'GLE 400 d', 'GLE 450', 'GLE 53 AMG', 'GLE 63 AMG S'],
		faixaPreco: { novo: 'R$ 550 mil a R$ 1,3 milhão', seminovo: 'R$ 300 mil a R$ 1 milhão' },
		diferenciais: [
			{ label: 'Performance', texto: 'Versão AMG 63 S com motor V8 biturbo de 612 cv. Suspensão E-Active Body Control que elimina inclinação em curvas.' },
			{ label: 'Status', texto: 'Mercedes-Benz como sinônimo de luxo. O GLE representa o equilíbrio perfeito entre tamanho, presença e sofisticação.' },
			{ label: 'Uso', texto: 'Interior MBUX de referência com dupla tela widescreen. Isolamento acústico excepcional e bancos que rivalizam com poltronas de primeira classe.' },
		],
		perfilIdeal: 'Executivos e famílias que priorizam conforto absoluto e tecnologia de ponta. O GLE é para quem quer chegar descansado após horas de viagem e impressionar em qualquer ocasião.',
		quandoNaoComprar: 'Se a prioridade é dirigibilidade esportiva pura. O GLE prioriza conforto sobre esportividade, mesmo nas versões AMG.',
		faq: [
			{ pergunta: 'Qual o preço do Mercedes GLE no Brasil?', resposta: 'Seminovos partem de R$ 300 mil e chegam a R$ 1 milhão para versões AMG 63 S. Novos começam em R$ 550 mil.' },
			{ pergunta: 'GLE ou BMW X5?', resposta: 'O GLE é mais confortável e luxuoso no interior. O X5 é mais esportivo e dinâmico na condução. Para conforto, GLE. Para dirigibilidade, X5.' },
			{ pergunta: 'O GLE Coupé vale a pena?', resposta: 'O GLE Coupé sacrifica espaço pelo design fastback. Para quem prioriza presença visual sobre funcionalidade, é uma alternativa atraente.' },
			{ pergunta: 'A Attra entrega o GLE em todo o Brasil?', resposta: 'Sim. Entrega em caminhão fechado com seguro completo para todo o território nacional.' },
		],
		modelosRelacionados: [
			{ nome: 'BMW X5', href: '/comprar/modelo/bmw-x5' },
			{ nome: 'Porsche Cayenne', href: '/comprar/modelo/porsche-cayenne' },
			{ nome: 'Audi Q7', href: '/comprar/modelo/audi-q7' },
		],
	},
]

// ---------------------------------------------------------------------------
// Bloco 2 — Páginas de Preço
// ---------------------------------------------------------------------------

export interface PrecoPage {
	slug: string
	brand: string
	model: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	faixaPreco: { periodo: string; faixaNovo: string; faixaSeminovo: string }[]
	diferencaVersoes: string
	fatoresPreco: string[]
	novoVsSeminovo: string
	valeAPena: string
	modeloSlug: string
}

export const PRECOS: PrecoPage[] = [
	{
		slug: 'porsche-911-brasil',
		brand: 'Porsche', model: '911',
		metaTitle: 'Preço Porsche 911 no Brasil | Tabela Atualizada | Attra Veículos',
		metaDescription: 'Preço do Porsche 911 no Brasil atualizado. Faixa de preço novo e seminovo, diferença entre versões e fatores que impactam o valor. Attra Veículos.',
		keywords: ['preço porsche 911', 'porsche 911 preço brasil', 'quanto custa porsche 911', 'porsche 911 valor'],
		faixaPreco: [
			{ periodo: 'Últimos 3 anos', faixaNovo: 'R$ 800 mil a R$ 3,5 mi', faixaSeminovo: 'R$ 500 mil a R$ 2,5 mi' },
			{ periodo: '3 a 6 anos', faixaNovo: '-', faixaSeminovo: 'R$ 400 mil a R$ 1,8 mi' },
			{ periodo: '6 a 10 anos', faixaNovo: '-', faixaSeminovo: 'R$ 350 mil a R$ 1,5 mi' },
		],
		diferencaVersoes: 'A versão Carrera base parte do menor valor. A Turbo S e GT3 RS são as mais valorizadas. Versões GT mantêm ou até valorizam com o tempo, especialmente com baixa quilometragem.',
		fatoresPreco: ['Quilometragem (abaixo de 20 mil km valoriza significativamente)', 'Histórico completo na rede autorizada', 'Opcionais de fábrica (PCCB, Sport Chrono, cores especiais)', 'Condição dos pneus e freios (especialmente cerâmicos)'],
		novoVsSeminovo: 'O 911 seminovo é uma das melhores compras do segmento esportivo. Modelos com 2 a 3 anos perdem entre 15% e 25% do valor de zero km, enquanto oferecem a mesma experiência de condução. Versões GT são exceção: muitas valorizam acima do preço de tabela.',
		valeAPena: 'Sim. O Porsche 911 é um dos veículos esportivos que menos deprecia no mercado brasileiro. É investimento e experiência de condução ao mesmo tempo.',
		modeloSlug: 'porsche-911',
	},
	{
		slug: 'bmw-m3-brasil',
		brand: 'BMW', model: 'M3',
		metaTitle: 'Preço BMW M3 no Brasil | Tabela Atualizada | Attra Veículos',
		metaDescription: 'Preço do BMW M3 no Brasil atualizado. Faixa de preço novo e seminovo, versões e fatores que impactam o valor. Attra Veículos.',
		keywords: ['preço bmw m3', 'bmw m3 preço brasil', 'quanto custa bmw m3', 'bmw m3 valor'],
		faixaPreco: [
			{ periodo: 'Últimos 3 anos', faixaNovo: 'R$ 700 mil a R$ 1,2 mi', faixaSeminovo: 'R$ 500 mil a R$ 900 mil' },
			{ periodo: '3 a 6 anos', faixaNovo: '-', faixaSeminovo: 'R$ 350 mil a R$ 600 mil' },
			{ periodo: '6 a 10 anos', faixaNovo: '-', faixaSeminovo: 'R$ 250 mil a R$ 450 mil' },
		],
		diferencaVersoes: 'O M3 Standard é a versão de entrada. O Competition adiciona potência e diferencial ativo. O CS é a versão mais exclusiva com menos peso e mais potência.',
		fatoresPreco: ['Quilometragem e histórico de uso (pista x rua)', 'Versão (Standard, Competition, xDrive, CS)', 'Condição do motor S58 e câmbio', 'Opcionais como bancos M e pacote Carbon'],
		novoVsSeminovo: 'O M3 seminovo da geração G80 oferece boa relação custo-performance. A geração anterior F80 é mais acessível e ainda muito competente. A depreciação inicial é de 20% a 30% nos primeiros 3 anos.',
		valeAPena: 'Para entusiastas de condução, o M3 é uma das melhores compras no segmento de sedans esportivos. Performance de pista em um carro funcional de 4 portas.',
		modeloSlug: 'bmw-m3',
	},
	{
		slug: 'mercedes-c63-amg-brasil',
		brand: 'Mercedes-Benz', model: 'C63 AMG',
		metaTitle: 'Preço Mercedes C63 AMG no Brasil | Tabela Atualizada | Attra Veículos',
		metaDescription: 'Preço do Mercedes C63 AMG no Brasil. Faixa de preço V8 e híbrido, diferença entre versões. Attra Veículos.',
		keywords: ['preço mercedes c63 amg', 'c63 amg preço brasil', 'quanto custa c63 amg', 'mercedes amg c63 valor'],
		faixaPreco: [
			{ periodo: 'Últimos 3 anos', faixaNovo: 'R$ 800 mil a R$ 1,3 mi', faixaSeminovo: 'R$ 500 mil a R$ 800 mil' },
			{ periodo: '3 a 6 anos (V8)', faixaNovo: '-', faixaSeminovo: 'R$ 350 mil a R$ 550 mil' },
			{ periodo: '6 a 10 anos (V8)', faixaNovo: '-', faixaSeminovo: 'R$ 280 mil a R$ 450 mil' },
		],
		diferencaVersoes: 'A versão S entrega mais potência e equipamentos. O Coupé tem visual mais esportivo. A nova geração W206 com 4 cilindros híbrido divide opiniões, mas oferece potência superior com auxílio elétrico.',
		fatoresPreco: ['Motor V8 (W205) vs 4 cilindros híbrido (W206)', 'Quilometragem e histórico de manutenção AMG', 'Versão (C 63, C 63 S, C 63 S Coupé)', 'Condição dos pneus e sistema de freios AMG'],
		novoVsSeminovo: 'As versões V8 (W205) estão se valorizando no mercado de seminovos por serem as últimas da linhagem V8. Comprar um V8 bem conservado pode ser investimento de médio prazo.',
		valeAPena: 'Sim, especialmente as versões V8. A combinação de sonoridade, performance e luxo Mercedes é única no segmento. As versões V8 tendem a se valorizar com o fim da produção.',
		modeloSlug: 'mercedes-c63-amg',
	},
	{
		slug: 'audi-rs6-brasil',
		brand: 'Audi', model: 'RS6',
		metaTitle: 'Preço Audi RS6 no Brasil | Tabela Atualizada | Attra Veículos',
		metaDescription: 'Preço do Audi RS6 Avant no Brasil. Faixa de preço, versões e análise de valor. Attra Veículos.',
		keywords: ['preço audi rs6', 'audi rs6 preço brasil', 'quanto custa audi rs6', 'audi rs6 avant valor'],
		faixaPreco: [
			{ periodo: 'Últimos 3 anos', faixaNovo: 'R$ 1 mi a R$ 1,5 mi', faixaSeminovo: 'R$ 750 mil a R$ 1,2 mi' },
			{ periodo: '3 a 6 anos', faixaNovo: '-', faixaSeminovo: 'R$ 600 mil a R$ 900 mil' },
			{ periodo: '6 a 10 anos', faixaNovo: '-', faixaSeminovo: 'R$ 400 mil a R$ 700 mil' },
		],
		diferencaVersoes: 'O RS6 Avant Standard já vem completo. A versão Performance adiciona 30 cv e detalhes exclusivos. Ambas compartilham o mesmo motor V8 4.0L biturbo.',
		fatoresPreco: ['Quilometragem (RS6 com menos de 15 mil km mantém valor alto)', 'Pacote de opcionais (Dynamic, Design, Black Optic)', 'Histórico completo na rede Audi', 'Condição da suspensão pneumática'],
		novoVsSeminovo: 'O RS6 seminovo recente é uma compra inteligente. A depreciação nos primeiros 2 anos é moderada (15% a 20%) e o carro mantém alto valor de revenda pela exclusividade.',
		valeAPena: 'Absolutamente. Não existe outro carro que combine V8 biturbo, 600 cv, espaço familiar e formato perua. É único no mercado.',
		modeloSlug: 'audi-rs6',
	},
	{
		slug: 'porsche-cayenne-brasil',
		brand: 'Porsche', model: 'Cayenne',
		metaTitle: 'Preço Porsche Cayenne no Brasil | Tabela Atualizada | Attra Veículos',
		metaDescription: 'Preço do Porsche Cayenne no Brasil. Todas as versões, faixa de preço novo e seminovo. Attra Veículos.',
		keywords: ['preço porsche cayenne', 'cayenne preço brasil', 'quanto custa porsche cayenne', 'cayenne valor'],
		faixaPreco: [
			{ periodo: 'Últimos 3 anos', faixaNovo: 'R$ 600 mil a R$ 1,8 mi', faixaSeminovo: 'R$ 400 mil a R$ 1,3 mi' },
			{ periodo: '3 a 6 anos', faixaNovo: '-', faixaSeminovo: 'R$ 300 mil a R$ 800 mil' },
			{ periodo: '6 a 10 anos', faixaNovo: '-', faixaSeminovo: 'R$ 200 mil a R$ 500 mil' },
		],
		diferencaVersoes: 'O Cayenne base já é completo. S e GTS oferecem mais potência. Turbo e Turbo GT são as versões de performance extrema. E-Hybrid combina economia urbana com potência.',
		fatoresPreco: ['Versão (base, S, GTS, Turbo, Turbo GT, E-Hybrid)', 'Quilometragem e histórico de revisões Porsche', 'Opcionais (PASM, ar condicionado 4 zonas, Pack Sport)', 'Formato (SUV ou Coupé)'],
		novoVsSeminovo: 'O Cayenne seminovo é excelente compra. A depreciação nos primeiros 3 anos é de 20% a 30%. Versões de 3 a 5 anos oferecem ótimo custo-benefício mantendo a qualidade Porsche.',
		valeAPena: 'Sim. O Cayenne é referência em SUVs esportivos e mantém valor de revenda consistente. É a porta de entrada mais prática para o universo Porsche.',
		modeloSlug: 'porsche-cayenne',
	},
	{
		slug: 'porsche-macan-brasil',
		brand: 'Porsche', model: 'Macan',
		metaTitle: 'Preço Porsche Macan no Brasil | Tabela Atualizada | Attra Veículos',
		metaDescription: 'Preço do Porsche Macan no Brasil. Faixa de preço novo e seminovo, versões disponíveis. Attra Veículos.',
		keywords: ['preço porsche macan', 'macan preço brasil', 'quanto custa porsche macan', 'macan valor'],
		faixaPreco: [
			{ periodo: 'Últimos 3 anos', faixaNovo: 'R$ 450 mil a R$ 800 mil', faixaSeminovo: 'R$ 300 mil a R$ 600 mil' },
			{ periodo: '3 a 6 anos', faixaNovo: '-', faixaSeminovo: 'R$ 200 mil a R$ 400 mil' },
			{ periodo: '6 a 10 anos', faixaNovo: '-', faixaSeminovo: 'R$ 150 mil a R$ 300 mil' },
		],
		diferencaVersoes: 'O Macan base é a versão mais acessível da Porsche. GTS com V6 biturbo é a versão com melhor custo-benefício em performance. Turbo é o topo com máxima potência.',
		fatoresPreco: ['Versão (base, S, GTS, Turbo)', 'Quilometragem e revisões na rede Porsche', 'Opcionais (Sport Chrono, PASM, teto panorâmico)', 'Geração do modelo'],
		novoVsSeminovo: 'O Macan é o Porsche mais acessível e um dos que mais deprecia nos primeiros anos (25% a 35%). Isso o torna uma excelente compra como seminovo.',
		valeAPena: 'Sim. É a forma mais acessível de ter um Porsche legítimo com excelente dirigibilidade no dia a dia urbano.',
		modeloSlug: 'porsche-macan',
	},
	{
		slug: 'bmw-x5-brasil',
		brand: 'BMW', model: 'X5',
		metaTitle: 'Preço BMW X5 no Brasil | Tabela Atualizada | Attra Veículos',
		metaDescription: 'Preço do BMW X5 no Brasil. Faixa de preço, versões e comparação novo vs seminovo. Attra Veículos.',
		keywords: ['preço bmw x5', 'bmw x5 preço brasil', 'quanto custa bmw x5', 'bmw x5 valor'],
		faixaPreco: [
			{ periodo: 'Últimos 3 anos', faixaNovo: 'R$ 600 mil a R$ 1,2 mi', faixaSeminovo: 'R$ 400 mil a R$ 900 mil' },
			{ periodo: '3 a 6 anos', faixaNovo: '-', faixaSeminovo: 'R$ 250 mil a R$ 550 mil' },
			{ periodo: '6 a 10 anos', faixaNovo: '-', faixaSeminovo: 'R$ 180 mil a R$ 400 mil' },
		],
		diferencaVersoes: 'O xDrive40i é a versão mais equilibrada. O M50i entrega performance com motor V8. O X5 M Competition é o extremo com mais de 600 cv.',
		fatoresPreco: ['Versão e motorização', 'Quilometragem e histórico BMW', 'Pacote de opcionais e acabamento', 'Condição da suspensão e eletrônica'],
		novoVsSeminovo: 'O X5 seminovo é uma compra inteligente. A depreciação dos primeiros 3 anos é de 25% a 35%, oferecendo acesso a um SUV premium completo por valor significativamente menor.',
		valeAPena: 'Sim. O X5 é um dos SUVs premium mais completos do mercado, equilibrando esportividade, espaço e tecnologia.',
		modeloSlug: 'bmw-x5',
	},
	{
		slug: 'bmw-x6-brasil',
		brand: 'BMW', model: 'X6',
		metaTitle: 'Preço BMW X6 no Brasil | Tabela Atualizada | Attra Veículos',
		metaDescription: 'Preço do BMW X6 no Brasil. SUV coupé com preço, versões e análise de valor. Attra Veículos.',
		keywords: ['preço bmw x6', 'bmw x6 preço brasil', 'quanto custa bmw x6', 'bmw x6 valor'],
		faixaPreco: [
			{ periodo: 'Últimos 3 anos', faixaNovo: 'R$ 650 mil a R$ 1,3 mi', faixaSeminovo: 'R$ 400 mil a R$ 1 mi' },
			{ periodo: '3 a 6 anos', faixaNovo: '-', faixaSeminovo: 'R$ 280 mil a R$ 600 mil' },
			{ periodo: '6 a 10 anos', faixaNovo: '-', faixaSeminovo: 'R$ 200 mil a R$ 450 mil' },
		],
		diferencaVersoes: 'O X6 xDrive40i é a versão mais vendida. O M50i adiciona motor V8. O X6 M Competition é a versão de performance máxima.',
		fatoresPreco: ['Versão e motorização', 'Quilometragem e histórico', 'Acabamento interno e opcionais', 'Condição geral do veículo'],
		novoVsSeminovo: 'O X6 deprecia ligeiramente mais que o X5 pelo perfil menos prático. Seminovos de 2 a 4 anos oferecem desconto de 30% a 40% sobre o zero km.',
		valeAPena: 'Sim, para quem valoriza o design coupé sobre a praticidade. O X6 oferece a mesma experiência BMW com uma estética diferenciada.',
		modeloSlug: 'bmw-x6',
	},
	{
		slug: 'audi-q7-brasil',
		brand: 'Audi', model: 'Q7',
		metaTitle: 'Preço Audi Q7 no Brasil | Tabela Atualizada | Attra Veículos',
		metaDescription: 'Preço do Audi Q7 no Brasil. SUV 7 lugares com preço, versões e análise. Attra Veículos.',
		keywords: ['preço audi q7', 'audi q7 preço brasil', 'quanto custa audi q7', 'audi q7 valor'],
		faixaPreco: [
			{ periodo: 'Últimos 3 anos', faixaNovo: 'R$ 500 mil a R$ 900 mil', faixaSeminovo: 'R$ 350 mil a R$ 700 mil' },
			{ periodo: '3 a 6 anos', faixaNovo: '-', faixaSeminovo: 'R$ 200 mil a R$ 450 mil' },
			{ periodo: '6 a 10 anos', faixaNovo: '-', faixaSeminovo: 'R$ 150 mil a R$ 300 mil' },
		],
		diferencaVersoes: 'O Q7 45 TFSI é a versão de entrada. O 55 TFSI oferece mais potência com motor V6. O SQ7 é a versão de performance com motor V8 diesel ou gasolina.',
		fatoresPreco: ['Versão e motorização', 'Quilometragem e revisões Audi', 'Condição da terceira fileira e interiores', 'Suspensão pneumática (quando equipado)'],
		novoVsSeminovo: 'O Q7 tem depreciação moderada a alta nos primeiros anos (30% a 40%). Isso torna os seminovos de 3 a 5 anos excelentes oportunidades para quem busca 7 lugares premium.',
		valeAPena: 'Sim. É um dos poucos SUVs premium com 7 lugares reais e funcionalidade Quattro completa.',
		modeloSlug: 'audi-q7',
	},
	{
		slug: 'audi-q8-brasil',
		brand: 'Audi', model: 'Q8',
		metaTitle: 'Preço Audi Q8 no Brasil | Tabela Atualizada | Attra Veículos',
		metaDescription: 'Preço do Audi Q8 no Brasil. SUV coupé de luxo com preço, versões e análise. Attra Veículos.',
		keywords: ['preço audi q8', 'audi q8 preço brasil', 'quanto custa audi q8', 'audi q8 valor'],
		faixaPreco: [
			{ periodo: 'Últimos 3 anos', faixaNovo: 'R$ 700 mil a R$ 1,5 mi', faixaSeminovo: 'R$ 450 mil a R$ 1,2 mi' },
			{ periodo: '3 a 6 anos', faixaNovo: '-', faixaSeminovo: 'R$ 350 mil a R$ 800 mil' },
			{ periodo: '6 a 10 anos', faixaNovo: '-', faixaSeminovo: 'R$ 250 mil a R$ 600 mil' },
		],
		diferencaVersoes: 'O Q8 55 TFSI é a versão principal. O SQ8 adiciona V8 diesel. O RS Q8 é o topo absoluto com V8 gasolina biturbo de 600 cv.',
		fatoresPreco: ['Versão (55 TFSI, SQ8, RS Q8)', 'Quilometragem e estado geral', 'Pacote tecnológico (dupla tela, head-up display)', 'Condição da suspensão adaptativa'],
		novoVsSeminovo: 'O Q8 deprecia entre 25% e 35% nos primeiros 3 anos. Versões RS Q8 mantêm valor acima da média pela exclusividade e performance.',
		valeAPena: 'Sim, especialmente como seminovo. Oferece o melhor da tecnologia Audi com design premium e presença marcante.',
		modeloSlug: 'audi-q8',
	},
	{
		slug: 'range-rover-sport-brasil',
		brand: 'Land Rover', model: 'Range Rover Sport',
		metaTitle: 'Preço Range Rover Sport no Brasil | Tabela Atualizada | Attra Veículos',
		metaDescription: 'Preço do Range Rover Sport no Brasil. Faixa de preço, versões e comparação. Attra Veículos.',
		keywords: ['preço range rover sport', 'range rover sport preço brasil', 'quanto custa range rover sport', 'range rover sport valor'],
		faixaPreco: [
			{ periodo: 'Últimos 3 anos', faixaNovo: 'R$ 700 mil a R$ 1,5 mi', faixaSeminovo: 'R$ 450 mil a R$ 1,2 mi' },
			{ periodo: '3 a 6 anos', faixaNovo: '-', faixaSeminovo: 'R$ 300 mil a R$ 700 mil' },
			{ periodo: '6 a 10 anos', faixaNovo: '-', faixaSeminovo: 'R$ 200 mil a R$ 500 mil' },
		],
		diferencaVersoes: 'P360 e P400 são versões 6 cilindros. P530 com V8. SVR é a versão de performance com V8 supercharged de 575 cv.',
		fatoresPreco: ['Versão e motorização', 'Quilometragem e histórico na rede Land Rover', 'Condição eletrônica e suspensão pneumática', 'Opcionais (teto panorâmico, sistema Meridian)'],
		novoVsSeminovo: 'O Range Rover Sport deprecia significativamente nos primeiros anos (30% a 45%). Seminovos de 3 a 5 anos são oportunidades reais de custo-benefício.',
		valeAPena: 'Sim, especialmente como seminovo bem conservado. A presença e o conforto justificam o investimento quando o veículo tem histórico limpo.',
		modeloSlug: 'range-rover-sport',
	},
	{
		slug: 'land-rover-defender-brasil',
		brand: 'Land Rover', model: 'Defender',
		metaTitle: 'Preço Land Rover Defender no Brasil | Tabela Atualizada | Attra Veículos',
		metaDescription: 'Preço do Land Rover Defender no Brasil. Versões 90, 110, 130 e V8. Faixa de preço e análise. Attra Veículos.',
		keywords: ['preço land rover defender', 'defender preço brasil', 'quanto custa defender', 'defender valor'],
		faixaPreco: [
			{ periodo: 'Últimos 3 anos', faixaNovo: 'R$ 500 mil a R$ 1,2 mi', faixaSeminovo: 'R$ 380 mil a R$ 1 mi' },
			{ periodo: '3 a 6 anos', faixaNovo: '-', faixaSeminovo: 'R$ 300 mil a R$ 700 mil' },
			{ periodo: '6 a 10 anos', faixaNovo: '-', faixaSeminovo: 'R$ 250 mil a R$ 500 mil' },
		],
		diferencaVersoes: 'O Defender 90 é o mais compacto. O 110 é o mais equilibrado para famílias. O 130 tem capacidade máxima. O V8 é a versão de performance com 525 cv.',
		fatoresPreco: ['Comprimento (90, 110, 130)', 'Motorização (4 cilindros, 6 cilindros, V8)', 'Quilometragem e uso (estrada x off-road)', 'Acessórios e preparação off-road'],
		novoVsSeminovo: 'O Defender tem alta demanda e filas de espera, o que mantém preços de seminovos próximos aos de zero km nos primeiros 2 anos. Após esse período, a depreciação começa a se normalizar.',
		valeAPena: 'Sim. É um veículo icônico com alta procura. A versão 110 oferece o melhor equilíbrio entre praticidade e presença.',
		modeloSlug: 'land-rover-defender',
	},
	{
		slug: 'mercedes-gle-brasil',
		brand: 'Mercedes-Benz', model: 'GLE',
		metaTitle: 'Preço Mercedes GLE no Brasil | Tabela Atualizada | Attra Veículos',
		metaDescription: 'Preço do Mercedes GLE no Brasil. Faixa de preço, versões e comparação novo vs seminovo. Attra Veículos.',
		keywords: ['preço mercedes gle', 'mercedes gle preço brasil', 'quanto custa mercedes gle', 'mercedes gle valor'],
		faixaPreco: [
			{ periodo: 'Últimos 3 anos', faixaNovo: 'R$ 550 mil a R$ 1,3 mi', faixaSeminovo: 'R$ 380 mil a R$ 1 mi' },
			{ periodo: '3 a 6 anos', faixaNovo: '-', faixaSeminovo: 'R$ 250 mil a R$ 600 mil' },
			{ periodo: '6 a 10 anos', faixaNovo: '-', faixaSeminovo: 'R$ 180 mil a R$ 400 mil' },
		],
		diferencaVersoes: 'O GLE 450 é a versão mais equilibrada. O AMG 53 adiciona esportividade. O AMG 63 S é o extremo com V8 biturbo de 612 cv.',
		fatoresPreco: ['Versão e motorização', 'Quilometragem e histórico Mercedes', 'Condição do sistema MBUX e eletrônica', 'Pacote de opcionais (AMG Line, Burmester, etc.)'],
		novoVsSeminovo: 'O GLE deprecia entre 25% e 35% nos primeiros 3 anos. Versões AMG mantêm valor acima da média. Seminovos de 2 a 4 anos oferecem excelente custo-benefício.',
		valeAPena: 'Sim. O GLE é referência em conforto e tecnologia na categoria. Seminovos bem conservados entregam uma experiência premium a um preço acessível.',
		modeloSlug: 'mercedes-gle',
	},
]

// ---------------------------------------------------------------------------
// Bloco 3 — Condição
// ---------------------------------------------------------------------------

export interface CondicaoPage {
	slug: string
	title: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	definicao: string
	vantagensVsZeroKm: string[]
	riscosMercadoAberto: string[]
	comoAttraReduz: { aspecto: string; descricao: string }[]
	categoriasDisponiveis: { nome: string; href: string }[]
	ctaText: string
}

export const CONDICOES: CondicaoPage[] = [
	{
		slug: 'seminovos-premium',
		title: 'Seminovos Premium à Venda',
		metaTitle: 'Seminovos Premium | Veículos de Luxo com Procedência | Attra Veículos',
		metaDescription: 'Seminovos premium com curadoria e procedência verificada. Porsche, BMW, Mercedes e mais. Vantagens sobre zero km e como comprar com segurança. Attra Veículos.',
		keywords: ['seminovos premium', 'carro de luxo seminovo', 'seminovo premium brasil', 'comprar seminovo de luxo'],
		definicao: 'Seminovos premium são veículos de alto padrão com até 5 anos de uso e quilometragem compatível, que passam por curadoria rigorosa de procedência, manutenção e estado de conservação. Na Attra, cada veículo é validado antes de entrar no estoque.',
		vantagensVsZeroKm: [
			'Economia de 20% a 40% em relação ao preço de zero km',
			'Depreciação inicial já absorvida pelo primeiro proprietário',
			'Mesma tecnologia e performance com investimento menor',
			'Possibilidade de acessar versões superiores pelo mesmo orçamento',
			'Veículos já rodados mostram sua condição real, sem surpresas',
		],
		riscosMercadoAberto: [
			'Procedência duvidosa e histórico incompleto',
			'Veículos com sinistro oculto ou adulteração de quilometragem',
			'Ausência de garantia e suporte pós-venda',
			'Documentação irregular ou pendências financeiras',
			'Peças substituídas por não originais sem registro',
		],
		comoAttraReduz: [
			{ aspecto: 'Curadoria', descricao: 'Cada veículo passa por inspeção detalhada antes de ser aceito no estoque. Avaliamos histórico, procedência e condição real.' },
			{ aspecto: 'Histórico', descricao: 'Verificação completa de documentação, Detran, sinistros, quilometragem e manutenções na rede autorizada.' },
			{ aspecto: 'Validação', descricao: 'Laudo cautelar independente, verificação de pintura original e análise técnica por especialistas.' },
		],
		categoriasDisponiveis: [
			{ nome: 'SUVs Premium', href: '/comprar/preco/600-a-1-milhao' },
			{ nome: 'Sedans Esportivos', href: '/comprar/modelo/bmw-m3' },
			{ nome: 'Porsche', href: '/comprar/modelo/porsche-911' },
			{ nome: 'BMW', href: '/comprar/modelo/bmw-x5' },
			{ nome: 'Mercedes-Benz', href: '/comprar/modelo/mercedes-gle' },
		],
		ctaText: 'Consultar seminovos premium disponíveis',
	},
	{
		slug: 'supercarros-seminovos',
		title: 'Supercarros Seminovos à Venda',
		metaTitle: 'Supercarros Seminovos | Ferrari, Porsche, Lamborghini | Attra Veículos',
		metaDescription: 'Supercarros seminovos com procedência verificada. Ferrari, Porsche GT, Lamborghini e mais. Compre com segurança na Attra Veículos.',
		keywords: ['supercarros seminovos', 'supercarro à venda brasil', 'ferrari seminova', 'porsche gt seminovo', 'lamborghini seminova'],
		definicao: 'Supercarros seminovos são veículos de altíssima performance com histórico verificado e condição preservada. Na Attra, cada superesportivo passa por validação especializada que vai além da inspeção padrão, incluindo análise de originalidade e compatibilidade de componentes.',
		vantagensVsZeroKm: [
			'Economia significativa na compra (supercarros novos podem ter ágio de até 50%)',
			'Acesso a versões especiais já descontinuadas ou com lista de espera fechada',
			'Veículo já com rodagem inicial feita, eliminando o período de amaciamento',
			'Possibilidade de modelos que se valorizaram acima do preço original',
			'Menor impacto financeiro da depreciação no primeiro ciclo de propriedade',
		],
		riscosMercadoAberto: [
			'Histórico de uso em pista não declarado',
			'Recalls não realizados ou manutenções fora da rede oficial',
			'Repinturas ou reparos ocultos que comprometem a originalidade',
			'Adulteração de quilometragem, especialmente comum em modelos de baixa produção',
			'Veículos de importação paralela sem homologação completa',
		],
		comoAttraReduz: [
			{ aspecto: 'Curadoria', descricao: 'Seleção criteriosa de cada superesportivo. Avaliamos procedência, uso, originalidade e compatibilidade de componentes.' },
			{ aspecto: 'Histórico', descricao: 'Verificação completa incluindo registros na rede oficial da marca, histórico de recalls e manutenções específicas.' },
			{ aspecto: 'Validação', descricao: 'Inspeção técnica especializada por profissionais com experiência em superesportivos. Análise de pintura, matching numbers e originalidade de componentes.' },
		],
		categoriasDisponiveis: [
			{ nome: 'Porsche 911', href: '/comprar/modelo/porsche-911' },
			{ nome: 'Acima de R$ 1 milhão', href: '/comprar/preco/acima-de-1-milhao' },
			{ nome: 'Importação', href: '/importacao-de-veiculos-de-luxo' },
		],
		ctaText: 'Ver supercarros disponíveis',
	},
]

// ---------------------------------------------------------------------------
// Bloco 4 — Faixa de Preço
// ---------------------------------------------------------------------------

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
}

export const FAIXAS_PRECO: FaixaPrecoPage[] = [
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
	},
]

// ---------------------------------------------------------------------------
// Bloco 5 — Perfil do Comprador (contexto de uso)
// ---------------------------------------------------------------------------

export interface PerfilComprador {
	slug: string
	title: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	contexto: string
	prioridades: string[]
	criteriosTecnicos: string[]
	errosComuns: string[]
	modelosIdeais: { nome: string; href: string; motivo: string }[]
	quandoNaoEscolher: string
	ctaText: string
}

export const PERFIS_COMPRADOR: PerfilComprador[] = [
	{
		slug: 'carro-executivo-alto-padrao',
		title: 'Carro Executivo de Alto Padrão',
		metaTitle: 'Carro Executivo Alto Padrão | Melhores Opções | Attra Veículos',
		metaDescription: 'Melhores carros executivos de alto padrão no Brasil. Isolamento, conforto e presença para o dia a dia corporativo. Attra Veículos.',
		keywords: ['carro executivo alto padrão', 'carro para executivo', 'suv executivo luxo', 'carro alto padrão brasil'],
		contexto: 'O executivo de alto padrão precisa de um veículo que projete imagem, ofereça conforto em deslocamentos intensos e funcione como extensão do ambiente profissional. Reuniões, cidade e viagens a negócios definem o uso.',
		prioridades: ['Imagem profissional adequada', 'Conforto em trânsito urbano intenso', 'Isolamento acústico para chamadas e concentração', 'Tecnologia embarcada funcional'],
		criteriosTecnicos: ['Isolamento acústico de referência', 'Suspensão com foco em conforto', 'Acabamento interno de primeiro nível', 'Sistema de conectividade integrado'],
		errosComuns: ['Escolher esportivo rígido para uso diário urbano', 'Priorizar potência sobre conforto de rodagem', 'Ignorar custo de manutenção e seguro na decisão'],
		modelosIdeais: [
			{ nome: 'BMW X5', href: '/comprar/modelo/bmw-x5', motivo: 'Equilíbrio entre esportividade e conforto executivo' },
			{ nome: 'Mercedes GLE', href: '/comprar/modelo/mercedes-gle', motivo: 'Interior mais luxuoso da categoria com tecnologia MBUX' },
			{ nome: 'Audi Q8', href: '/comprar/modelo/audi-q8', motivo: 'Design sofisticado com tecnologia de ponta' },
		],
		quandoNaoEscolher: 'Se o uso principal é lazer ou fins de semana. Para esse perfil, um esportivo puro ou SUV mais compacto pode ser mais prazeroso que um executivo focado em conforto.',
		ctaText: 'Falar com especialista sobre veículos executivos',
	},
	{
		slug: 'carro-para-politicos-e-autoridades',
		title: 'Carro para Políticos e Autoridades',
		metaTitle: 'Carro para Políticos e Autoridades | Segurança e Discrição | Attra Veículos',
		metaDescription: 'Melhores carros para políticos e autoridades. Segurança, blindagem compatível e discrição funcional. Attra Veículos.',
		keywords: ['carro para políticos', 'carro para autoridades', 'carro blindado luxo', 'veículo segurança autoridades'],
		contexto: 'Políticos e autoridades precisam de veículos que combinem segurança passiva e ativa, conforto traseiro para trabalho em trânsito, e discrição funcional que não atraia atenção desnecessária.',
		prioridades: ['Segurança pessoal e de ocupantes', 'Discrição funcional (sem ostentação)', 'Conforto traseiro para trabalho', 'Robustez estrutural'],
		criteriosTecnicos: ['Compatibilidade com blindagem nível III-A ou superior', 'Conforto traseiro com espaço para pernas', 'Robustez de chassi e suspensão', 'Vidros e portas reforçáveis'],
		errosComuns: ['Escolher carro chamativo ou esportivo para uso institucional', 'Ignorar compatibilidade de blindagem na escolha do modelo', 'Priorizar design sobre funcionalidade de segurança'],
		modelosIdeais: [
			{ nome: 'Range Rover Sport', href: '/comprar/modelo/range-rover-sport', motivo: 'Robustez, presença discreta e excelente compatibilidade com blindagem' },
			{ nome: 'BMW X5', href: '/comprar/modelo/bmw-x5', motivo: 'Plataforma robusta com versões já preparadas para blindagem de fábrica' },
			{ nome: 'Mercedes GLE', href: '/comprar/modelo/mercedes-gle', motivo: 'Conforto traseiro excepcional e estrutura preparada para proteção' },
		],
		quandoNaoEscolher: 'Se não há necessidade real de segurança reforçada. A blindagem impacta peso, consumo e dirigibilidade. Quando a discrição é o único objetivo, um sedan executivo padrão pode ser suficiente.',
		ctaText: 'Consultar veículos compatíveis com blindagem',
	},
	{
		slug: 'carro-para-track-day',
		title: 'Carro para Track Day',
		metaTitle: 'Carro para Track Day | Performance Real de Pista | Attra Veículos',
		metaDescription: 'Melhores carros para track day no Brasil. Performance, equilíbrio e preparação para pista. Attra Veículos.',
		keywords: ['carro track day', 'carro para pista', 'esportivo track day brasil', 'carro performance pista'],
		contexto: 'Track day exige performance real e mensurável. Não basta potência: o carro precisa de equilíbrio, frenagem, relação peso/potência e capacidade de suportar uso intenso em pista sem falhas.',
		prioridades: ['Performance mensurável em pista', 'Relação peso/potência otimizada', 'Capacidade de frenagem repetitiva', 'Equilíbrio dinâmico e previsibilidade'],
		criteriosTecnicos: ['Relação peso/potência favorável', 'Sistema de freios de alto desempenho (cerâmicos ideais)', 'Equilíbrio de chassi e suspensão ajustável', 'Refrigeração adequada para uso prolongado em pista'],
		errosComuns: ['Comprar carro pesado achando que potência compensa', 'Escolher SUV esportivo para uso real de pista', 'Ignorar custo de consumíveis de pista (pneus, pastilhas, fluidos)'],
		modelosIdeais: [
			{ nome: 'Porsche 911', href: '/comprar/modelo/porsche-911', motivo: 'Referência absoluta em esportivos de pista com uso diário possível' },
			{ nome: 'BMW M3', href: '/comprar/modelo/bmw-m3', motivo: 'Sedan esportivo com equilíbrio excepcional e diferencial ativo' },
		],
		quandoNaoEscolher: 'Se o uso real de pista é esporádico (menos de 4 vezes por ano). Nesse caso, um esportivo de uso misto oferece melhor custo-benefício que um carro focado em track day.',
		ctaText: 'Consultar esportivos disponíveis para track day',
	},
	{
		slug: 'carro-para-golfe-e-lifestyle',
		title: 'Carro para Golfe e Lifestyle',
		metaTitle: 'Carro para Golfe e Lifestyle | Conforto e Praticidade | Attra Veículos',
		metaDescription: 'Melhores carros para golfe e lifestyle premium. Espaço, conforto e imagem para clube e lazer. Attra Veículos.',
		keywords: ['carro para golfe', 'carro lifestyle luxo', 'suv para clube', 'carro lazer premium'],
		contexto: 'O estilo de vida de golfe e clube exige um veículo que combine espaço para equipamentos, conforto de deslocamento e imagem adequada ao ambiente social. Praticidade e elegância são igualmente importantes.',
		prioridades: ['Espaço para equipamentos (tacos, malas)', 'Conforto de deslocamento', 'Imagem adequada ao contexto social', 'Praticidade de acesso e uso'],
		criteriosTecnicos: ['Porta-malas amplo e acessível', 'Conforto de suspensão para estradas variadas', 'Acabamento que transmite sofisticação sem exagero', 'Facilidade de entrada e saída'],
		errosComuns: ['Escolher carro esportivo sem espaço funcional', 'Priorizar performance sobre conforto de passageiros', 'Ignorar a praticidade do porta-malas para o estilo de vida'],
		modelosIdeais: [
			{ nome: 'Porsche Cayenne', href: '/comprar/modelo/porsche-cayenne', motivo: 'Espaço, presença e versatilidade com DNA esportivo Porsche' },
			{ nome: 'Audi Q7', href: '/comprar/modelo/audi-q7', motivo: '7 lugares e espaço generoso para toda a família e equipamentos' },
			{ nome: 'Range Rover Sport', href: '/comprar/modelo/range-rover-sport', motivo: 'Luxo britânico com capacidade off-road para acessos variados' },
		],
		quandoNaoEscolher: 'Se a prioridade é esportividade pura. Para esse perfil de uso, o conforto e a funcionalidade devem prevalecer sobre a performance de pista.',
		ctaText: 'Consultar SUVs premium disponíveis',
	},
	{
		slug: 'carro-de-luxo-para-esposa',
		title: 'Carro de Luxo para Esposa',
		metaTitle: 'Carro de Luxo para Esposa | Conforto e Segurança | Attra Veículos',
		metaDescription: 'Melhores carros de luxo para esposa. Conforto, facilidade de condução e segurança. Attra Veículos.',
		keywords: ['carro de luxo para esposa', 'carro premium feminino', 'suv compacto luxo mulher', 'carro confortável seguro'],
		contexto: 'A escolha prioriza conforto de condução, segurança ativa e passiva, facilidade de manobra e tecnologia que simplifique o dia a dia. O veículo precisa ser acessível em tamanho e sofisticado em experiência.',
		prioridades: ['Facilidade de condução e manobra', 'Segurança ativa e passiva completa', 'Conforto diário sem complicação', 'Tecnologia intuitiva e funcional'],
		criteriosTecnicos: ['Dirigibilidade acessível e responsiva', 'Tecnologia de assistência ao motorista', 'Tamanho adequado para uso urbano', 'Conforto de banco e posição de dirigir'],
		errosComuns: ['Escolher SUV grande e difícil de manobrar', 'Priorizar potência desnecessária para o perfil de uso', 'Ignorar ergonomia e facilidade de uso da tecnologia'],
		modelosIdeais: [
			{ nome: 'Porsche Macan', href: '/comprar/modelo/porsche-macan', motivo: 'SUV compacto com dirigibilidade esportiva e tamanho ideal para cidade' },
			{ nome: 'Audi Q5', href: '/comprar/preco/400-a-600-mil', motivo: 'Tamanho médio com tecnologia Audi e conforto de referência' },
		],
		quandoNaoEscolher: 'Se a condutora prefere carros maiores e com mais presença. Nesse caso, um Cayenne ou X5 pode ser mais adequado que um SUV compacto.',
		ctaText: 'Consultar SUVs compactos premium disponíveis',
	},
	{
		slug: 'carro-para-viagens-longas',
		title: 'Carro para Viagens Longas',
		metaTitle: 'Carro para Viagens Longas | Conforto e Autonomia | Attra Veículos',
		metaDescription: 'Melhores carros para viagens longas. Conforto contínuo, estabilidade e autonomia. Attra Veículos.',
		keywords: ['carro para viagens longas', 'carro confortável estrada', 'suv viagem longa', 'carro autonomia estrada'],
		contexto: 'Viagens longas de estrada exigem conforto contínuo por horas, estabilidade em alta velocidade, isolamento acústico eficiente e autonomia de tanque. O motorista precisa chegar descansado após centenas de quilômetros.',
		prioridades: ['Conforto contínuo por horas de condução', 'Estabilidade em velocidade de cruzeiro', 'Autonomia de tanque acima da média', 'Isolamento acústico eficiente'],
		criteriosTecnicos: ['Estabilidade direcional em alta velocidade', 'Consumo eficiente para a categoria', 'Conforto de suspensão em pavimento variável', 'Bancos com múltiplos ajustes e ventilação'],
		errosComuns: ['Escolher esportivo rígido para viagens longas', 'Priorizar potência sobre conforto de cruzeiro', 'Ignorar autonomia e consumo na decisão'],
		modelosIdeais: [
			{ nome: 'BMW X5', href: '/comprar/modelo/bmw-x5', motivo: 'Equilíbrio ideal entre conforto de viagem e dirigibilidade' },
			{ nome: 'Audi Q7', href: '/comprar/modelo/audi-q7', motivo: 'Conforto de primeira classe com espaço para toda a família' },
			{ nome: 'Mercedes GLE', href: '/comprar/modelo/mercedes-gle', motivo: 'Isolamento acústico e conforto de referência para longas distâncias' },
		],
		quandoNaoEscolher: 'Se as viagens são majoritariamente urbanas e curtas. Para uso exclusivamente urbano, um SUV compacto como o Macan ou Q5 oferece melhor custo-benefício.',
		ctaText: 'Consultar SUVs de conforto disponíveis',
	},
	{
		slug: 'carro-para-uso-urbano-premium',
		title: 'Carro para Uso Urbano Premium',
		metaTitle: 'Carro para Uso Urbano Premium | Praticidade e Conforto | Attra Veículos',
		metaDescription: 'Melhores carros para uso urbano premium. Praticidade, facilidade de manobra e conforto diário. Attra Veículos.',
		keywords: ['carro urbano premium', 'suv compacto urbano luxo', 'carro para cidade premium', 'carro confortável urbano'],
		contexto: 'O uso urbano premium exige praticidade acima de tudo: facilidade de manobra, tamanho adequado para estacionamentos, conforto no trânsito e tecnologia que simplifique o dia a dia na cidade.',
		prioridades: ['Praticidade em espaços urbanos', 'Conforto no trânsito diário', 'Tamanho adequado para estacionamentos', 'Facilidade de manobra'],
		criteriosTecnicos: ['Dimensões compactas para a categoria', 'Sistema de câmeras e assistência de estacionamento', 'Raio de giro reduzido', 'Modos de condução urbanos eficientes'],
		errosComuns: ['Comprar SUV grande demais para uso exclusivamente urbano', 'Ignorar custo de manutenção e consumo urbano', 'Priorizar status sobre funcionalidade diária'],
		modelosIdeais: [
			{ nome: 'Porsche Macan', href: '/comprar/modelo/porsche-macan', motivo: 'O SUV compacto premium com a melhor dirigibilidade da categoria' },
			{ nome: 'Audi Q5', href: '/comprar/preco/400-a-600-mil', motivo: 'Tamanho ideal para cidade com tecnologia Quattro e conforto Audi' },
		],
		quandoNaoEscolher: 'Se há necessidade frequente de transportar mais de 4 pessoas ou equipamentos volumosos. Nesse caso, um SUV de porte médio como X5 ou Q7 é mais indicado.',
		ctaText: 'Consultar SUVs compactos disponíveis',
	},
]

// ---------------------------------------------------------------------------
// Bloco 6 — Guias Operacionais (Colecionadores)
// ---------------------------------------------------------------------------

export interface GuiaOperacional {
	slug: string
	title: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	sections: { heading: string; content: string }[]
	modelosCompativeis: { nome: string; href: string }[]
	ctaPrimario: string
	ctaSecundario: string
}

export const GUIAS_OPERACIONAIS: GuiaOperacional[] = [
	{
		slug: 'blindagem-carro-de-luxo',
		title: 'Blindagem de Carro de Luxo',
		metaTitle: 'Blindagem de Carro de Luxo | Quando Vale a Pena | Attra Veículos',
		metaDescription: 'Guia completo sobre blindagem de carros de luxo. Quando blindar, impacto no valor e quais modelos fazem sentido. Attra Veículos.',
		keywords: ['blindagem carro de luxo', 'blindar carro premium', 'blindagem suv luxo', 'blindagem e valorização'],
		sections: [
			{ heading: 'Quando blindar e quando NÃO blindar', content: 'A blindagem faz sentido para SUVs e sedans de grande porte usados em contextos de risco real: autoridades, empresários com exposição pública e profissionais que transitam em áreas sensíveis. Não faz sentido para esportivos de uso recreativo, carros de coleção ou veículos que priorizam performance. A blindagem adiciona entre 150 kg e 300 kg ao veículo, impactando diretamente a dinâmica de condução.' },
			{ heading: 'Impacto na dirigibilidade e performance', content: 'O peso adicional da blindagem afeta aceleração, frenagem e consumo. Em SUVs robustos como Range Rover e X5, o impacto é absorvido melhor pela estrutura. Em sedans esportivos, a perda de dinâmica é perceptível e pode comprometer a experiência de condução que justificou a compra.' },
			{ heading: 'Impacto na valorização ou desvalorização', content: 'Veículos blindados têm mercado de revenda mais restrito. SUVs blindados para uso executivo mantêm liquidez razoável. Esportivos blindados perdem valor significativo pela descaracterização. A blindagem nunca agrega valor de mercado, apenas reduz o público comprador.' },
			{ heading: 'Quais modelos fazem sentido blindar', content: 'SUVs de grande porte: Range Rover, BMW X5, Mercedes GLE, Audi Q7. Sedans executivos: Mercedes Classe S, BMW Série 7. Esses modelos absorvem o peso extra e mantêm funcionalidade adequada.' },
			{ heading: 'Erro comum: blindar carro esportivo', content: 'Blindar um Porsche 911, BMW M3 ou qualquer esportivo de performance é contraproducente. O peso extra elimina os diferenciais de condução que justificam esses veículos. Se segurança é prioridade, a escolha correta é um SUV robusto, não um esportivo blindado.' },
			{ heading: 'Comparação: SUV vs esportivo para blindagem', content: 'SUVs são projetados para suportar peso adicional sem comprometer a estrutura. Possuem suspensão mais robusta, maior espaço para acomodar o material blindado e centro de gravidade que tolera a carga extra. Esportivos são projetados para otimização de peso, e qualquer adição compromete sua razão de existir.' },
		],
		modelosCompativeis: [
			{ nome: 'Range Rover Sport', href: '/comprar/modelo/range-rover-sport' },
			{ nome: 'BMW X5', href: '/comprar/modelo/bmw-x5' },
			{ nome: 'Mercedes GLE', href: '/comprar/modelo/mercedes-gle' },
			{ nome: 'Audi Q7', href: '/comprar/modelo/audi-q7' },
		],
		ctaPrimario: 'Falar com especialista',
		ctaSecundario: 'Avaliar veículo disponível',
	},
	{
		slug: 'placa-preta-carro-antigo',
		title: 'Placa Preta para Carro Antigo',
		metaTitle: 'Placa Preta Carro Antigo | Critérios e Processo | Attra Veículos',
		metaDescription: 'Tudo sobre placa preta para carros antigos. Critérios de originalidade, processo de certificação e impacto no valor. Attra Veículos.',
		keywords: ['placa preta carro antigo', 'placa preta veículo', 'certificação carro antigo', 'carro antigo originalidade'],
		sections: [
			{ heading: 'Critérios reais para placa preta', content: 'O veículo precisa ter no mínimo 30 anos de fabricação, estar em condições de originalidade preservada e passar por avaliação de um clube de automóveis antigos credenciado. Não basta ser velho: precisa ser original.' },
			{ heading: 'Nível de originalidade exigido', content: 'Motor, câmbio, carroceria e interior devem ser originais ou restaurados com peças originais da marca. Modificações de performance ou estéticas que descaracterizem o veículo original podem impedir a certificação. A documentação do processo de restauração é fundamental.' },
			{ heading: 'Quais modelos têm potencial', content: 'Porsche 911 das séries antigas (930, 964), Mercedes-Benz SL (W107, R129), BMW 2002, BMW E30 M3, Land Rover Defender clássico. Modelos com produção limitada e relevância histórica têm maior potencial de certificação e valorização.' },
			{ heading: 'Impacto no valor de mercado', content: 'A placa preta pode valorizar o veículo em 20% a 50% dependendo do modelo e condição. Além do valor monetário, confere status de veículo histórico e benefícios como isenção de rodízio em algumas cidades.' },
			{ heading: 'Riscos de "falsa originalidade"', content: 'Veículos apresentados como originais mas com componentes substituídos ou números de chassi remarcados. A avaliação criteriosa por especialistas é essencial para evitar fraudes que comprometem o investimento.' },
			{ heading: 'Processo de certificação', content: 'O processo envolve: filiação a um clube credenciado, inspeção veicular detalhada, análise de documentação, avaliação por comissão técnica e emissão do certificado. O prazo médio é de 2 a 6 meses dependendo da complexidade.' },
		],
		modelosCompativeis: [
			{ nome: 'Porsche 911', href: '/comprar/modelo/porsche-911' },
			{ nome: 'Land Rover Defender', href: '/comprar/modelo/land-rover-defender' },
		],
		ctaPrimario: 'Falar com especialista',
		ctaSecundario: 'Avaliar veículo disponível',
	},
	{
		slug: 'preservacao-de-veiculos-de-luxo',
		title: 'Preservação de Veículos de Luxo',
		metaTitle: 'Preservação de Veículos de Luxo | Como Manter Valor | Attra Veículos',
		metaDescription: 'Como preservar veículos de luxo e manter originalidade. Armazenamento, manutenção e erros que destroem valor. Attra Veículos.',
		keywords: ['preservação veículo luxo', 'manter valor carro luxo', 'armazenamento carro coleção', 'conservação carro premium'],
		sections: [
			{ heading: 'Como manter originalidade', content: 'Originalidade é o fator que mais impacta o valor de um veículo premium no longo prazo. Manter peças originais, pintura de fábrica e interior intacto é fundamental. Qualquer modificação deve ser reversível e documentada.' },
			{ heading: 'Armazenamento correto', content: 'Ambiente coberto, ventilado e com controle de umidade é ideal. Para veículos de coleção, considere desumidificadores e protetores de bateria com carga lenta. Evite exposição prolongada ao sol direto e garagens com infiltração.' },
			{ heading: 'Quilometragem vs valorização', content: 'Baixa quilometragem valoriza, mas veículos que não rodam também sofrem. Borrachas, fluidos e componentes se degradam pela inatividade. O ideal é uso moderado e regular, com manutenção preventiva constante.' },
			{ heading: 'Manutenção preventiva vs invasiva', content: 'Manutenção preventiva (trocas de fluidos, filtros, correias) preserva valor. Manutenção invasiva desnecessária (abrir motor sem necessidade, repintar sem razão) pode reduzir o valor. Siga o cronograma da fábrica e registre tudo.' },
			{ heading: 'Impacto de modificações', content: 'Modificações de performance ou estéticas reduzem o valor de veículos premium na revenda. O mercado paga mais por carros originais. Se for modificar, guarde as peças originais para reversão futura.' },
			{ heading: 'Erros que destroem valor', content: 'Repintura total sem necessidade, troca de interior original por personalizado, instalação de som aftermarket, rebaixamento permanente, uso de peças não originais em manutenção. Cada modificação irreversível reduz o valor de mercado.' },
		],
		modelosCompativeis: [
			{ nome: 'Porsche 911', href: '/comprar/modelo/porsche-911' },
			{ nome: 'Land Rover Defender', href: '/comprar/modelo/land-rover-defender' },
			{ nome: 'Mercedes C63 AMG', href: '/comprar/modelo/mercedes-c63-amg' },
		],
		ctaPrimario: 'Falar com especialista',
		ctaSecundario: 'Avaliar veículo disponível',
	},
	{
		slug: 'seguro-carros-de-alto-valor',
		title: 'Seguro para Carros de Alto Valor',
		metaTitle: 'Seguro Carros de Alto Valor | O Que Saber | Attra Veículos',
		metaDescription: 'Guia sobre seguro para carros de alto valor. Cobertura ideal, critérios das seguradoras e erros comuns. Attra Veículos.',
		keywords: ['seguro carro alto valor', 'seguro supercarro', 'seguro carro luxo brasil', 'seguro carro premium'],
		sections: [
			{ heading: 'Diferença entre seguro comum e alto valor', content: 'Seguros de alto valor trabalham com avaliação individualizada do veículo, não tabela FIPE. A cobertura considera valor de mercado real, incluindo opcionais e condição específica. Algumas seguradoras especializadas oferecem cobertura agreed value (valor acordado).' },
			{ heading: 'Cobertura ideal para supercarros', content: 'Cobertura agreed value que garante o valor real do veículo. Cobertura para peças originais de reposição. Guincho especializado (plataforma, não gancho). Carro reserva de categoria compatível. Cobertura para eventos e track days (quando disponível).' },
			{ heading: 'Critérios das seguradoras', content: 'As seguradoras avaliam: perfil do motorista (idade, histórico), local de guarda (garagem fechada obrigatória para supercarros), quilometragem anual estimada, uso do veículo (diário, lazer, coleção) e existência de sistema de rastreamento.' },
			{ heading: 'Impacto de uso (daily vs coleção)', content: 'Veículos de uso diário têm prêmio mais alto pelo risco maior de sinistro. Veículos de coleção com uso limitado podem ter desconto de até 40% no seguro. Declarar uso incorreto pode invalidar a apólice.' },
			{ heading: 'Erros comuns na contratação', content: 'Subestimar o valor do veículo na apólice. Não declarar opcionais que impactam o valor. Ignorar exclusões de cobertura para uso em pista. Não verificar rede de oficinas credenciadas para reparos. Contratar seguro com tabela FIPE em vez de valor de mercado.' },
		],
		modelosCompativeis: [
			{ nome: 'Porsche 911', href: '/comprar/modelo/porsche-911' },
			{ nome: 'BMW M3', href: '/comprar/modelo/bmw-m3' },
			{ nome: 'Mercedes C63 AMG', href: '/comprar/modelo/mercedes-c63-amg' },
		],
		ctaPrimario: 'Falar com especialista',
		ctaSecundario: 'Avaliar veículo disponível',
	},
	{
		slug: 'avaliacao-e-originalidade-veiculos',
		title: 'Avaliação e Originalidade de Veículos',
		metaTitle: 'Avaliação e Originalidade de Veículos | Como Validar | Attra Veículos',
		metaDescription: 'Como validar procedência e originalidade de veículos premium. Matching numbers, documentação e sinais de alerta. Attra Veículos.',
		keywords: ['avaliação veículo premium', 'originalidade carro luxo', 'matching numbers', 'procedência veículo'],
		sections: [
			{ heading: 'Como validar procedência real', content: 'Procedência se valida com documentação completa: nota fiscal de compra original, transferências registradas, comprovantes de revisões na rede autorizada e laudo cautelar independente. Para veículos importados, verifique a documentação de nacionalização e homologação do INMETRO.' },
			{ heading: 'Histórico e documentação', content: 'O histórico ideal inclui: todas as notas de revisão na rede oficial, registro de recalls realizados, comprovante de procedência (primeiro proprietário), e consulta limpa no Detran (sem multas, sinistros, alienação). Lacunas no histórico são sinais de alerta.' },
			{ heading: 'Matching numbers (quando aplicável)', content: 'Em veículos de coleção e supercarros, matching numbers significa que motor, câmbio e chassi possuem numeração correspondente de fábrica. Isso confirma que os componentes são originais e nunca foram substituídos, valorizando significativamente o veículo.' },
			{ heading: 'Sinais de modificação indevida', content: 'Parafusos com marcas de ferramentas inadequadas, adesivos cobrindo números de série, pintura com diferença de tom entre painéis, interior com materiais não originais, quilometragem inconsistente com o desgaste visível. Qualquer um desses sinais exige investigação aprofundada.' },
			{ heading: 'Impacto direto no preço', content: 'Um veículo com procedência impecável e originalidade preservada pode valer 20% a 40% mais que um similar com histórico duvidoso. Para supercarros e modelos de coleção, a diferença pode ser ainda maior.' },
			{ heading: 'Erro crítico: comprar sem validação', content: 'O erro mais caro do mercado de veículos premium é comprar sem validação profissional. Economia no processo de avaliação pode resultar em prejuízo de dezenas ou centenas de milhares de reais. A Attra realiza validação completa em cada veículo do estoque.' },
		],
		modelosCompativeis: [
			{ nome: 'Porsche 911', href: '/comprar/modelo/porsche-911' },
			{ nome: 'Land Rover Defender', href: '/comprar/modelo/land-rover-defender' },
			{ nome: 'BMW M3', href: '/comprar/modelo/bmw-m3' },
		],
		ctaPrimario: 'Falar com especialista',
		ctaSecundario: 'Avaliar veículo disponível',
	},
]

// ---------------------------------------------------------------------------
// Bloco 7 — Confiança
// ---------------------------------------------------------------------------

export interface ConfiancaPage {
	slug: string
	title: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	sections: { heading: string; content: string }[]
	ctaText: string
}

export const CONFIANCA_PAGES: ConfiancaPage[] = [
	{
		slug: 'por-que-comprar-na-attra',
		title: 'Por Que Comprar na Attra',
		metaTitle: 'Por Que Comprar na Attra | Diferenciais Reais | Attra Veículos',
		metaDescription: 'Por que comprar seu veículo de luxo na Attra. Processo completo, diferenciais reais e segurança na transação. Attra Veículos.',
		keywords: ['por que comprar na attra', 'attra veículos diferenciais', 'comprar carro luxo seguro', 'loja veículos premium confiável'],
		sections: [
			{ heading: 'Curadoria rigorosa de estoque', content: 'Cada veículo que entra no estoque da Attra passa por avaliação detalhada. Verificamos procedência, histórico de manutenção, condição real de pintura e mecânica, e documentação completa. Rejeitamos veículos que não atendem nossos critérios, independente do potencial de lucro.' },
			{ heading: 'Mais de 15 anos de mercado', content: 'A Attra Veículos opera desde 2009 em Uberlândia, Minas Gerais. São mais de 15 anos construindo reputação com transações transparentes e clientes satisfeitos em todo o Brasil.' },
			{ heading: 'Processo transparente de compra', content: 'Da escolha do veículo ao recebimento na sua porta, cada etapa é comunicada com clareza. Sem surpresas, sem custos ocultos e sem pressão de venda. Você decide no seu tempo com todas as informações disponíveis.' },
			{ heading: 'Suporte pós-venda', content: 'A relação não termina na entrega. Oferecemos suporte para questões de documentação, indicação de oficinas especializadas e acompanhamento do veículo após a compra.' },
			{ heading: 'Entrega nacional especializada', content: 'Entregamos em todo o Brasil com caminhão fechado, seguro completo e rastreamento em tempo real. O veículo sai do nosso estoque e chega à sua porta com a mesma condição.' },
		],
		ctaText: 'Conheça nosso estoque com procedência verificada',
	},
	{
		slug: 'garantia-e-procedencia',
		title: 'Garantia e Procedência',
		metaTitle: 'Garantia e Procedência | Veículos Verificados | Attra Veículos',
		metaDescription: 'Como a Attra garante procedência e qualidade de cada veículo. Processo de validação, garantia e segurança. Attra Veículos.',
		keywords: ['garantia carro luxo', 'procedência veículo premium', 'garantia attra veículos', 'carro luxo com garantia'],
		sections: [
			{ heading: 'Processo de validação', content: 'Cada veículo passa por inspeção em múltiplas etapas: verificação documental completa (Detran, multas, sinistros, alienação), laudo cautelar por empresa independente, análise de pintura com medidor de espessura, teste de sistemas eletrônicos e mecânicos, e avaliação de desgaste compatível com quilometragem declarada.' },
			{ heading: 'Documentação garantida', content: 'Todos os veículos são entregues com documentação completa e regular. Transferência facilitada, IPVA verificado e nenhuma pendência administrativa. A Attra assume responsabilidade pela regularidade documental no momento da venda.' },
			{ heading: 'Histórico de manutenção', content: 'Priorizamos veículos com histórico completo na rede autorizada. Quando o histórico é parcial, informamos com transparência quais registros estão disponíveis e quais verificações complementares foram realizadas.' },
			{ heading: 'Garantia Attra', content: 'Oferecemos garantia nos veículos comercializados conforme as condições estabelecidas para cada veículo. Os termos específicos são apresentados antes da finalização da compra, sem ambiguidade.' },
			{ heading: 'Segurança da transação', content: 'Pagamentos processados por canais bancários formais. Contratos detalhados com todas as condições da venda. Nota fiscal emitida para cada transação. Tudo registrado e documentado para segurança de ambas as partes.' },
		],
		ctaText: 'Consultar veículos com procedência verificada',
	},
	{
		slug: 'como-funciona-entrega-brasil',
		title: 'Como Funciona a Entrega no Brasil',
		metaTitle: 'Entrega de Veículos em Todo o Brasil | Attra Veículos',
		metaDescription: 'Como funciona a entrega de veículos de luxo da Attra para todo o Brasil. Logística especializada, seguro e rastreamento. Attra Veículos.',
		keywords: ['entrega veículo luxo brasil', 'transporte carro premium', 'entrega carro luxo nacional', 'logística veículo alto valor'],
		sections: [
			{ heading: 'Escolha e confirmação', content: 'Após escolher seu veículo e finalizar a compra, nossa equipe de logística inicia o planejamento da entrega. Você recebe confirmação com prazo estimado e detalhes do transporte.' },
			{ heading: 'Preparação do veículo', content: 'O veículo passa por preparação final: limpeza completa, verificação de todos os sistemas e documentação fotográfica detalhada do estado antes do embarque. Essas fotos são compartilhadas com você como registro de condição.' },
			{ heading: 'Transporte especializado', content: 'Utilizamos caminhões fechados exclusivos para veículos de alto valor. O veículo é fixado com cintas específicas em plataforma nivelada, protegido contra intempéries e vibrações durante todo o trajeto.' },
			{ heading: 'Seguro completo de transporte', content: 'Todo veículo transportado possui seguro que cobre o valor integral durante o trajeto. Em caso de qualquer intercorrência, a cobertura é total e imediata.' },
			{ heading: 'Rastreamento em tempo real', content: 'Você acompanha o trajeto do seu veículo em tempo real. Nossa equipe envia atualizações e você pode consultar a localização a qualquer momento durante o transporte.' },
			{ heading: 'Entrega e conferência', content: 'Na entrega, você realiza conferência do veículo comparando com as fotos de embarque. Qualquer divergência é tratada imediatamente. Só consideramos a entrega concluída após sua aprovação.' },
			{ heading: 'Prazos estimados', content: 'Triângulo Mineiro e BH: 1 a 3 dias úteis. São Paulo e Rio de Janeiro: 2 a 4 dias úteis. Demais capitais: 3 a 7 dias úteis. Interior e regiões remotas: 5 a 10 dias úteis. Prazos podem variar conforme condições logísticas.' },
		],
		ctaText: 'Consultar disponibilidade e prazo de entrega',
	},
]

// ---------------------------------------------------------------------------
// Bloco 8 — Importação
// ---------------------------------------------------------------------------

export interface ImportacaoMain {
	metaTitle: string
	metaDescription: string
	keywords: string[]
	intro: string
	etapas: { titulo: string; descricao: string }[]
	paraQuemFazSentido: string[]
	vantagensVsBrasil: string[]
	riscos: { risco: string; solucao: string }[]
	exemplosVeiculos: string[]
	ctaText: string
}

export const IMPORTACAO_MAIN: ImportacaoMain = {
	metaTitle: 'Importação de Veículos de Luxo no Brasil | Attra Veículos',
	metaDescription: 'Importação de veículos de luxo no Brasil. Processo completo, etapas, custos e como a Attra simplifica a importação do seu carro dos sonhos.',
	keywords: ['importação veículo luxo brasil', 'importar carro luxo', 'importação carro premium', 'importar porsche ferrari lamborghini'],
	intro: 'A Attra oferece serviço completo de importação de veículos de luxo. Do sourcing internacional à entrega na sua porta, cuidamos de cada etapa para que você tenha acesso a modelos exclusivos que não estão disponíveis no mercado brasileiro.',
	etapas: [
		{ titulo: 'Escolha do veículo', descricao: 'Definição do modelo, versão, especificações e orçamento junto ao cliente. Alinhamento de expectativas sobre prazo, custos e disponibilidade no mercado internacional.' },
		{ titulo: 'Sourcing internacional', descricao: 'Busca do veículo nas melhores fontes internacionais. Verificação de procedência, histórico e condição real antes de qualquer compromisso. Negociação de preço e condições de compra.' },
		{ titulo: 'Documentação', descricao: 'Tratamento de toda a documentação necessária: fatura comercial, certificados de origem, documentação alfandegária e requisitos do INMETRO para homologação brasileira.' },
		{ titulo: 'Nacionalização', descricao: 'Processo de importação junto à Receita Federal, pagamento de impostos (II, IPI, PIS, COFINS, ICMS) e desembaraço aduaneiro. Acompanhamento em cada etapa até a liberação do veículo.' },
		{ titulo: 'Entrega', descricao: 'Após nacionalização e emplacamento, o veículo é entregue na sua porta com toda a documentação brasileira regularizada e pronto para uso.' },
	],
	paraQuemFazSentido: [
		'Quem busca modelos não comercializados oficialmente no Brasil',
		'Quem deseja versões específicas ou configurações exclusivas',
		'Quem encontrou oportunidade de preço vantajosa no exterior',
		'Colecionadores que buscam modelos raros ou edições limitadas',
	],
	vantagensVsBrasil: [
		'Acesso a modelos e versões indisponíveis no mercado nacional',
		'Possibilidade de configuração personalizada direto da fábrica',
		'Acesso a preços internacionais (antes de impostos) mais competitivos',
		'Modelos de coleção e edições limitadas com disponibilidade global',
	],
	riscos: [
		{ risco: 'Carga tributária elevada no Brasil', solucao: 'A Attra calcula antecipadamente todos os custos de importação para que não haja surpresas no valor final.' },
		{ risco: 'Prazo de entrega longo (3 a 6 meses)', solucao: 'Comunicação constante com atualizações de cada etapa. Prazo realista definido antes do compromisso.' },
		{ risco: 'Problemas de homologação', solucao: 'A Attra trabalha apenas com veículos que podem ser homologados no Brasil, verificando compatibilidade antes de iniciar o processo.' },
		{ risco: 'Garantia limitada para importados', solucao: 'Orientamos sobre cobertura de garantia disponível e opções de extensão para veículos importados diretamente.' },
	],
	exemplosVeiculos: [
		'Porsche 911 GT3 RS com configuração especial',
		'Ferrari 296 GTB com especificações exclusivas',
		'Lamborghini Huracán Tecnica',
		'Porsche Cayenne Turbo GT em cores de catálogo exclusivo',
		'Mercedes-AMG GT Black Series',
	],
	ctaText: 'Solicitar veículo sob demanda',
}

export interface ImportacaoMarca {
	slug: string
	brand: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	intro: string
	modelosImportaveis: string[]
	vantagens: string[]
	prazoMedio: string
	custoEstimado: string
	ctaText: string
}

export const IMPORTACAO_MARCAS: ImportacaoMarca[] = [
	{
		slug: 'porsche',
		brand: 'Porsche',
		metaTitle: 'Importação Porsche | Modelos Exclusivos | Attra Veículos',
		metaDescription: 'Importação de Porsche para o Brasil. Modelos disponíveis, vantagens, prazo e custo estimado. Attra Veículos.',
		keywords: ['importar porsche brasil', 'importação porsche', 'porsche importado', 'comprar porsche importado'],
		intro: 'A Porsche oferece configurações e versões que nem sempre chegam ao mercado brasileiro. Com a importação direta, você acessa modelos exclusivos como GT3 RS, GT4 RS, Turbo S com pacotes especiais e cores de catálogo que não são disponibilizadas pela representante oficial no Brasil.',
		modelosImportaveis: ['911 GT3 RS', '911 GT3', '718 Cayman GT4 RS', '911 Turbo S (configurações especiais)', 'Cayenne Turbo GT (cores exclusivas)', 'Taycan Turbo GT'],
		vantagens: ['Acesso a cores Paint to Sample e pacotes exclusivos', 'Versões de alta performance não comercializadas no Brasil', 'Configuração personalizada direto da fábrica Stuttgart', 'Preço potencialmente competitivo em versões de alta demanda com ágio local'],
		prazoMedio: '3 a 5 meses do pedido à entrega final no Brasil, dependendo da disponibilidade do modelo e processo de nacionalização.',
		custoEstimado: 'O custo total inclui o preço do veículo no exterior + impostos de importação (60% a 80% sobre o valor CIF, dependendo da categoria) + frete internacional + despesas de nacionalização e homologação. A Attra fornece orçamento detalhado antes do compromisso.',
		ctaText: 'Solicitar importação de Porsche',
	},
	{
		slug: 'ferrari',
		brand: 'Ferrari',
		metaTitle: 'Importação Ferrari | Modelos Exclusivos | Attra Veículos',
		metaDescription: 'Importação de Ferrari para o Brasil. Modelos disponíveis, vantagens, prazo e custo estimado. Attra Veículos.',
		keywords: ['importar ferrari brasil', 'importação ferrari', 'ferrari importada', 'comprar ferrari importada'],
		intro: 'A Ferrari no Brasil possui lista de espera e alocação limitada. A importação direta permite acesso a modelos específicos, cores de catálogo personalizado e versões que podem ter fila de anos no mercado oficial.',
		modelosImportaveis: ['296 GTB / GTS', 'SF90 Stradale / Spider', 'Roma / Roma Spider', 'F8 Tributo (mercado secundário)', '812 Superfast (mercado secundário)', 'Purosangue'],
		vantagens: ['Acesso a modelos com lista de espera de anos no Brasil', 'Cores Tailor Made e configurações exclusivas', 'Possibilidade de adquirir modelos descontinuados no exterior', 'Preços internacionais podem ser competitivos versus ágio brasileiro'],
		prazoMedio: '4 a 6 meses do pedido à entrega, podendo variar conforme disponibilidade no mercado internacional e processo de nacionalização.',
		custoEstimado: 'Ferraris importadas têm custo total significativo com impostos brasileiros. O preço final pode ser 60% a 100% acima do valor no exterior. A Attra calcula o valor total antes de qualquer compromisso para decisão informada.',
		ctaText: 'Solicitar importação de Ferrari',
	},
	{
		slug: 'lamborghini',
		brand: 'Lamborghini',
		metaTitle: 'Importação Lamborghini | Modelos Exclusivos | Attra Veículos',
		metaDescription: 'Importação de Lamborghini para o Brasil. Modelos disponíveis, vantagens, prazo e custo estimado. Attra Veículos.',
		keywords: ['importar lamborghini brasil', 'importação lamborghini', 'lamborghini importada', 'comprar lamborghini importada'],
		intro: 'A Lamborghini oferece modelos com produção limitada e versões especiais que raramente chegam ao Brasil pela representante oficial. A importação direta permite acessar configurações Ad Personam e modelos exclusivos.',
		modelosImportaveis: ['Huracán Tecnica', 'Huracán STO', 'Revuelto', 'Urus Performante', 'Edições limitadas e versões especiais'],
		vantagens: ['Acesso a versões Ad Personam com personalização total', 'Modelos de produção limitada com alocação restrita', 'Possibilidade de cores e acabamentos exclusivos', 'Acesso ao mercado secundário internacional de modelos raros'],
		prazoMedio: '4 a 6 meses do pedido à entrega, dependendo da disponibilidade do modelo e complexidade da importação.',
		custoEstimado: 'Similar à Ferrari, com impostos brasileiros que podem dobrar o valor do veículo. A Attra apresenta orçamento completo e transparente antes de qualquer compromisso.',
		ctaText: 'Solicitar importação de Lamborghini',
	},
]

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function findModelo(slug: string) {
	return MODELOS.find(m => m.slug === slug)
}
export function findPreco(slug: string) {
	return PRECOS.find(p => p.slug === slug)
}
export function findCondicao(slug: string) {
	return CONDICOES.find(c => c.slug === slug)
}
export function findFaixaPreco(slug: string) {
	return FAIXAS_PRECO.find(f => f.slug === slug)
}
export function findPerfil(slug: string) {
	return PERFIS_COMPRADOR.find(p => p.slug === slug)
}
export function findGuiaOperacional(slug: string) {
	return GUIAS_OPERACIONAIS.find(g => g.slug === slug)
}
export function findConfianca(slug: string) {
	return CONFIANCA_PAGES.find(c => c.slug === slug)
}
export function findImportacaoMarca(slug: string) {
	return IMPORTACAO_MARCAS.find(m => m.slug === slug)
}
