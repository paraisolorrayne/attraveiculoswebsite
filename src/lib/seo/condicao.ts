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
			{ nome: 'SUVs Premium', href: '/comprar/faixa-preco/600-a-1-milhao' },
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
			{ nome: 'Acima de R$ 1 milhão', href: '/comprar/faixa-preco/acima-de-1-milhao' },
			{ nome: 'Importação', href: '/importacao-de-veiculos-de-luxo' },
		],
		ctaText: 'Ver supercarros disponíveis',
	},
	{
		slug: 'carros-esportivos-usados',
		title: 'Carros Esportivos Usados à Venda',
		metaTitle: 'Carros Esportivos Usados à Venda | Procedência Verificada | Attra Veículos',
		metaDescription: 'Carros esportivos usados com procedência verificada e histórico auditado. Porsche, Ferrari, BMW M e AMG. O que checar antes de comprar. Attra Veículos.',
		keywords: ['carros esportivos usados', 'carro esportivo usado a venda', 'comprar esportivo usado', 'loja de carro esportivo', 'esportivo seminovo brasil'],
		definicao: 'Carro esportivo usado é o veículo de performance que já teve um ou mais proprietários — de um Porsche 911 a um BMW M ou Mercedes-AMG. É o segmento em que a diferença entre um bom e um mau negócio está menos no preço e mais no histórico: como foi rodado, onde foi revisado e o que já precisou trocar.',
		vantagensVsZeroKm: [
			'A depreciação mais forte já foi absorvida pelo primeiro dono',
			'Acesso a versões de motor atmosférico que saíram de linha',
			'Mesma performance por um investimento sensivelmente menor',
			'Modelos com produção encerrada tendem a estabilizar ou valorizar',
			'O comportamento real do carro já se manifestou — não há surpresa de fábrica',
		],
		riscosMercadoAberto: [
			'Uso em pista sem registro: desgaste de motor, freio e câmbio muito acima do que a quilometragem sugere',
			'Embreagem e suspensão no fim da vida útil, com custo de troca próximo ao de um carro popular',
			'Peças de performance instaladas fora da rede, que anulam garantia e comprometem revenda',
			'Retrabalho de pintura mascarando batida em carro de fibra ou alumínio',
			'Histórico de manutenção incompleto — em esportivo, o que não foi feito custa mais que o que foi',
		],
		comoAttraReduz: [
			{ aspecto: 'Histórico de uso', descricao: 'Verificamos revisões na rede autorizada, intervalo entre elas e sinais de uso em pista. Em esportivo, o padrão de manutenção diz mais que o hodômetro.' },
			{ aspecto: 'Componentes de desgaste', descricao: 'Avaliação de embreagem, freios, pneus e suspensão — os itens que definem se o carro está pronto para uso ou exige investimento imediato.' },
			{ aspecto: 'Originalidade', descricao: 'Conferência de pintura, painéis e peças de motor. Modificação não registrada derruba valor de revenda e pode indicar histórico omitido.' },
		],
		categoriasDisponiveis: [
			{ nome: 'Porsche', href: '/comprar/porsche' },
			{ nome: 'Ferrari', href: '/comprar/ferrari' },
			{ nome: 'Lamborghini', href: '/comprar/lamborghini' },
			{ nome: 'Supercarros seminovos', href: '/comprar/condicao/supercarros-seminovos' },
			{ nome: 'Estoque completo', href: '/veiculos' },
		],
		ctaText: 'Fale com um especialista sobre o esportivo que você procura',
	},
	{
		slug: 'carros-de-luxo-usados',
		title: 'Carros de Luxo Usados à Venda',
		metaTitle: 'Carros de Luxo Usados à Venda | Curadoria e Procedência | Attra Veículos',
		metaDescription: 'Carros de luxo usados com procedência verificada, laudo cautelar e entrega em todo o Brasil. Como avaliar antes de comprar. Attra Veículos, Uberlândia (MG).',
		keywords: ['carros de luxo usados', 'carro de luxo usado a venda', 'comprar carro de luxo usado', 'onde comprar carros de luxo', 'loja de carros de luxo'],
		definicao: 'Carro de luxo usado é o veículo de alto padrão que já foi emplacado — sedãs, SUVs e cupês de marcas como Mercedes-Benz, BMW, Audi, Land Rover, Porsche e Bentley. É o segmento com a maior distância entre o preço de anúncio e o custo real de propriedade, e é aí que a procedência decide o negócio.',
		vantagensVsZeroKm: [
			'A perda de valor mais acentuada acontece nos dois primeiros anos e já passou',
			'O mesmo orçamento alcança uma versão superior, com mais opcionais de fábrica',
			'Opcionais que encareceram o carro novo pouco somam no preço de usado — e você leva',
			'Prazo de entrega imediato, sem fila de importação',
			'Modelos consolidados têm histórico de defeitos conhecido e documentado',
		],
		riscosMercadoAberto: [
			'Manutenção adiada pelo dono anterior, que chega como custo logo após a compra',
			'Componentes caros no fim da vida — suspensão pneumática, câmbio e módulos eletrônicos',
			'Sinistro de médio porte reparado sem registro em seguradora',
			'Quilometragem adulterada, especialmente em carro importado sem histórico nacional',
			'Pendência financeira ou documental que só aparece na transferência',
		],
		comoAttraReduz: [
			{ aspecto: 'Laudo cautelar', descricao: 'Laudo independente com verificação de numeração de chassi, estrutura e pintura, feito antes de o veículo entrar no estoque.' },
			{ aspecto: 'Procedência', descricao: 'Consulta de sinistro, gravame, débitos e histórico de proprietários. Carro com pendência não entra.' },
			{ aspecto: 'Custo de propriedade', descricao: 'Levantamos o que está próximo de vencer — revisão, pneus, suspensão — e informamos antes da compra, não depois.' },
		],
		categoriasDisponiveis: [
			{ nome: 'Mercedes-Benz', href: '/comprar/mercedes-benz' },
			{ nome: 'BMW', href: '/comprar/bmw' },
			{ nome: 'Land Rover', href: '/comprar/land-rover' },
			{ nome: 'Bentley', href: '/comprar/bentley' },
			{ nome: 'Seminovos premium', href: '/comprar/condicao/seminovos-premium' },
		],
		ctaText: 'Fale com um especialista sobre o carro de luxo que você procura',
	},
]

// ---------------------------------------------------------------------------
