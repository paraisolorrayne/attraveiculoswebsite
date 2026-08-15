/**
 * Conteúdo editorial das páginas /marca.
 *
 * ATENÇÃO — ESTE ARQUIVO É RASCUNHO PARA REVISÃO (15/08/2026).
 * Redigido por IA a partir de fatos históricos estáveis, para a Attra editar
 * antes de publicar. Ver LEIA-ME abaixo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * /marca e /comprar/marca coexistem de propósito, com intenções diferentes:
 *
 *   /comprar/ferrari   intenção de compra. É onde o anúncio pago cai. Fala de
 *                      estoque, preço, procedência, condições.
 *
 *   /ferrari           intenção informacional. História, contexto, o que a
 *                      marca é — com os carros disponíveis no meio do caminho.
 *
 * Sem essa separação as duas seriam a mesma página em dois endereços, e eram:
 * medido em 15/08/2026, o texto visível das duas diferia por uma única palavra
 * ("Comprar", do breadcrumb). Duas URLs com o mesmo conteúdo não somam — o
 * buscador escolhe uma e descarta a outra. É este conteúdo que torna a
 * coexistência legítima.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LEIA-ME PARA QUEM VAI REVISAR
 *
 * 1. Os fatos históricos (ano de fundação, cidade, fundador) são estáveis e
 *    verificáveis. Confira mesmo assim.
 *
 * 2. NÃO há número de potência, aceleração ou preço em lugar nenhum. Número
 *    envelhece, varia por geração e por mercado, e errar um deles queima a
 *    credibilidade da página inteira. Se quiser incluir, inclua com a fonte.
 *
 * 3. `oQueVerificar` é a seção que MAIS precisa da sua revisão. É onde a
 *    página deixa de repetir Wikipédia e passa a valer alguma coisa — e é
 *    conhecimento de oficina, não de enciclopédia. Escrevi de forma
 *    conservadora, sem apontar defeito de geração específica. Se a Attra tem
 *    posição firmada sobre um ponto, ela vale mais do que o que está aqui.
 *
 * 4. `perguntas` vira FAQ estruturado (schema.org/FAQPage). Resposta curta e
 *    direta é o que é citado por buscador e por LLM. Resposta vaga não é
 *    citada por ninguém.
 */

export interface PerguntaEditorial {
	pergunta: string
	resposta: string
}

/**
 * Identidade de uma LINHA que ganha página própria sem ser uma marca.
 *
 * O caso é o Range Rover: no estoque ele chega como `brand: "Land Rover",
 * model: "Range Rover"`, mas no mercado é procurado como se fosse marca — e a
 * própria fabricante o posiciona assim. A página existe para essa busca, sem
 * inventar uma marca que não existe no catálogo nem no estoque.
 */
export interface LinhaPropria {
	displayName: string
	country: string
	/** Marca de SEO_BRANDS de onde vêm o estoque e a página comercial. */
	marcaBase: string
	/**
	 * Só entram veículos cujo modelo contém este texto.
	 *
	 * Sem ele, a página do Range Rover mostraria Defender e Discovery: o filtro
	 * de marca casaria com toda a Land Rover, e `range-rover` inclusive é alias
	 * de `land-rover` na normalização de marca.
	 */
	filtroDeModelo: string
}

/**
 * Gênero gramatical do nome, para a página concordar.
 *
 * Marca costuma ser feminina em português ("a Ferrari", "a Porsche" — subentende
 * "a marca"), mas nome de linha segue o carro: "o Range Rover", "um Range Rover
 * usado". Sem isto a página escreveria "numa Range Rover usada" em todos os
 * títulos, e erro de concordância em página que quer autoridade custa caro.
 */
export type GeneroDoNome = 'f' | 'm'

export interface MarcaEditorial {
	/** H1 da página — informacional, nunca comercial: /comprar cobre a compra. */
	titulo: string
	/** Uma frase que situa a marca. Aparece sob o H1. */
	resumo: string
	/** Onde e quando nasceu. Fatos, não adjetivos. */
	origem: string
	/** O que define a engenharia e a identidade da marca. */
	identidade: string
	/** Como a marca chegou ao Brasil e como ela circula por aqui. */
	noBrasil: string
	/** O que olhar num usado desta marca. A seção de maior valor da página. */
	oQueVerificar: string[]
	/** Vira FAQPage no JSON-LD. */
	perguntas: PerguntaEditorial[]
	/** Ausente = feminino, que é o caso de toda marca aqui. */
	genero?: GeneroDoNome
	/** Preenchido só quando o slug não é uma marca de SEO_BRANDS. */
	linha?: LinhaPropria
}

/** Artigos e terminações já flexionados, para os textos da página. */
export function flexao(genero: GeneroDoNome = 'f') {
	const masculino = genero === 'm'
	return {
		/** a / o */
		def: masculino ? 'o' : 'a',
		/** A / O — início de frase */
		defMaiusculo: masculino ? 'O' : 'A',
		/** uma / um */
		indef: masculino ? 'um' : 'uma',
		/** numa / num */
		em: masculino ? 'num' : 'numa',
		/** usada / usado */
		usado: masculino ? 'usado' : 'usada',
		/** Nenhuma / Nenhum */
		nenhum: masculino ? 'Nenhum' : 'Nenhuma',
		/** específica / específico */
		especifico: masculino ? 'específico' : 'específica',
		/** disponíveis é invariável, mas fica junto para não espalhar a regra */
		disponiveis: 'disponíveis',
	}
}

export const MARCAS_EDITORIAL: Record<string, MarcaEditorial> = {
	ferrari: {
		titulo: 'Ferrari: história, modelos e o que saber antes de comprar',
		resumo:
			'A marca de Maranello nasceu de uma equipe de corrida e nunca deixou de ser uma — os carros de rua existem, historicamente, para sustentar a competição.',
		origem:
			'Enzo Ferrari fundou a Scuderia Ferrari em 1929, em Modena, como equipe de corrida que competia com carros Alfa Romeo. A fábrica própria veio depois: o primeiro carro a levar o nome Ferrari, o 125 S, é de 1947. A sede está em Maranello, na Emília-Romanha, desde a década de 1940 — a mesma região da Lamborghini, da Maserati e da Pagani, o que ficou conhecido como o vale dos motores.',
		identidade:
			'A ordem importa para entender a marca: a Ferrari é uma equipe de corrida que fabrica carros de rua, não o contrário. É a única construtora presente em todas as temporadas de Fórmula 1 desde 1950, e a transferência de tecnologia da pista para a rua é o eixo de comunicação da marca há décadas. Na prática, isso aparece em transmissões de dupla embreagem, aerodinâmica ativa e eletrônica de controle de tração — soluções que estrearam na competição antes de chegar ao consumidor.',
		noBrasil:
			'Ferrari não tem produção no Brasil e nunca teve: todo exemplar aqui é importado, seja pela rede oficial, seja por importação independente. Isso torna o histórico de importação parte da procedência do carro — nota fiscal de entrada, registro de importação e a coerência entre eles contam tanto quanto a quilometragem.',
		oQueVerificar: [
			'Histórico de revisões na rede autorizada, com as datas e as quilometragens batendo entre si — em carro de baixa rodagem, a revisão vence por tempo, não por quilômetro.',
			'Documentação de importação completa e coerente com o chassi, especialmente em exemplares que entraram por importação independente.',
			'Registro de participação em eventos de pista, que não desqualifica o carro mas muda o que se espera de componentes de desgaste.',
			'Estado dos itens que envelhecem parados: pneus por data de fabricação, fluidos, baterias e borrachas de vedação.',
			'Originalidade da configuração de fábrica, já que personalização posterior nem sempre soma valor de revenda.',
		],
		perguntas: [
			{
				pergunta: 'Ferrari é um bom carro para uso no dia a dia?',
				resposta:
					'Depende do modelo. As linhas de gran turismo foram projetadas para uso frequente e viagem, enquanto os superesportivos de motor central priorizam desempenho e têm altura livre do solo, visibilidade e capacidade de bagagem menores. A escolha do modelo importa mais que a escolha da marca nesse caso.',
			},
			{
				pergunta: 'Ferrari seminova vale mais a pena que zero-quilômetro?',
				resposta:
					'Em geral sim, do ponto de vista financeiro: a maior perda de valor de um carro novo acontece nos primeiros anos, e um exemplar seminovo com procedência verificada entrega a mesma experiência. A exceção são as séries de produção limitada, que podem não desvalorizar da forma habitual.',
			},
			{
				pergunta: 'Quanto custa manter uma Ferrari no Brasil?',
				resposta:
					'O custo se concentra em revisões periódicas, pneus, seguro e itens de desgaste, e varia bastante conforme o modelo e o uso. Peça a um vendedor sério o histórico de manutenção do exemplar específico: ele diz mais sobre o custo futuro do que qualquer média de mercado.',
			},
		],
	},

	porsche: {
		titulo: 'Porsche: história, linha atual e o que saber antes de comprar',
		resumo:
			'Nasceu como escritório de projetos, virou fabricante quase por acaso e construiu a identidade mais consistente da indústria em torno de um único carro.',
		origem:
			'Ferdinand Porsche abriu em 1931, em Stuttgart, um escritório de engenharia que prestava serviço para outras montadoras. O primeiro carro com o nome da casa é o 356, de 1948. O 911 chegou no início dos anos 1960 e segue em linha até hoje, sempre com motor traseiro — uma continuidade que praticamente não tem paralelo na indústria.',
		identidade:
			'A Porsche é a marca que menos rompeu com o próprio passado. O 911 manteve silhueta e arquitetura mecânica reconhecíveis por mais de meio século, e é essa continuidade que sustenta o valor dos exemplares antigos. A empresa também construiu uma trajetória rara em resistência — Le Mans é parte da identidade da marca tanto quanto a Fórmula 1 é da Ferrari. A entrada em SUVs e sedãs, que gerou resistência entre puristas, é o que financia a linha esportiva.',
		noBrasil:
			'A Porsche tem presença oficial estabelecida no Brasil, com rede de concessionárias e assistência em várias capitais. Isso muda a conta em relação a marcas sem representação: peça e serviço são mais acessíveis, e o histórico de revisões costuma ser rastreável na rede.',
		oQueVerificar: [
			'Histórico de revisões na rede oficial, que na Porsche costuma ser bem documentado e é o primeiro sinal de um exemplar bem cuidado.',
			'Qual geração exatamente é o carro — dentro do mesmo nome comercial convivem gerações com mecânica e valor de mercado bem diferentes.',
			'Uso em track day, comum nesta marca: não reprova o carro, mas exige olhar mais atento em freios, pneus, fluidos e embreagem.',
			'Coerência entre a configuração de fábrica e o que está no carro, já que o catálogo de opcionais da marca é extenso e influencia a revenda.',
			'Em modelos elétricos e híbridos, o histórico de carregamento e a saúde da bateria de tração.',
		],
		perguntas: [
			{
				pergunta: 'Qual Porsche é melhor para quem está comprando a primeira?',
				resposta:
					'Depende do uso pretendido. Para uso diário com espaço, os SUVs e o sedã da marca são os mais práticos. Para quem quer a experiência esportiva clássica da marca, o 911 e os modelos de motor central são o caminho — com a ressalva de que exigem mais tolerância no dia a dia.',
			},
			{
				pergunta: 'Porsche mantém valor de revenda?',
				resposta:
					'Historicamente a marca tem desvalorização mais lenta que a média do segmento premium, e o 911 é o caso mais citado. Isso vale para exemplares com procedência clara e manutenção documentada — sem histórico, a vantagem desaparece.',
			},
			{
				pergunta: 'Vale a pena comprar Porsche importado por conta própria?',
				resposta:
					'Com rede oficial presente no Brasil, a importação independente costuma fazer menos sentido nesta marca do que em outras. Quando acontece, a documentação de importação precisa estar completa e coerente com o chassi.',
			},
		],
	},

	lamborghini: {
		titulo: 'Lamborghini: história, modelos e o que saber antes de comprar',
		resumo:
			'Fundada por um fabricante de tratores que decidiu construir um gran turismo melhor que o da concorrência — e acabou definindo o que é um superesportivo.',
		origem:
			'Ferruccio Lamborghini, industrial do setor de tratores e climatização, fundou a Automobili Lamborghini em 1963, em Sant\'Agata Bolognese, a poucos quilômetros de Maranello. O Miura, de 1966, colocou o motor no meio do carro e é apontado como o ponto em que o superesportivo moderno nasceu. A marca pertence hoje ao grupo Volkswagen, via Audi.',
		identidade:
			'A Lamborghini nunca correu em Fórmula 1 como equipe e nunca precisou: sua identidade se construiu no design e na presença, não no palmarês. As linhas retas e angulares que se tornaram assinatura da casa vêm da década de 1970 e seguem reconhecíveis. É a marca do vale dos motores que mais aposta em impacto visual — e a que mais rapidamente incorporou tração integral e SUV à linha.',
		noBrasil:
			'Todo exemplar no Brasil é importado. A marca tem presença oficial em São Paulo, mas boa parte da frota nacional entrou por importação independente, o que torna a documentação de entrada parte essencial da verificação.',
		oQueVerificar: [
			'Documentação de importação completa e coerente com o chassi — ponto crítico nesta marca pela quantidade de exemplares que entraram fora da rede oficial.',
			'Histórico de revisões, com atenção especial a carros de baixa rodagem, em que o vencimento por tempo é o que manda.',
			'Estado da embreagem em modelos com transmissão automatizada de embreagem simples, das gerações que usaram esse tipo de câmbio.',
			'Sinais de uso em pista e de alterações de escapamento ou eletrônica, comuns nesta marca e relevantes para a revenda.',
			'Estado da pintura e dos painéis, considerando a altura livre do solo baixa dos modelos de motor central.',
		],
		perguntas: [
			{
				pergunta: 'Qual a diferença entre os modelos de motor V10 e V12 da Lamborghini?',
				resposta:
					'Historicamente a marca mantém duas linhas: a de V12, que é a linha principal e mais exclusiva, e a de V10, mais acessível e de produção maior. O SUV da marca segue uma terceira lógica, com motor turbo e proposta de uso diário.',
			},
			{
				pergunta: 'Lamborghini pode ser usada no dia a dia no Brasil?',
				resposta:
					'Os modelos de motor central enfrentam limitação real de altura livre do solo em lombadas e rampas, o que restringe o uso urbano. O SUV da marca foi projetado justamente para resolver isso e é o mais viável para uso frequente.',
			},
		],
	},

	mclaren: {
		titulo: 'McLaren: história, modelos e o que saber antes de comprar',
		resumo:
			'Uma equipe de Fórmula 1 que passou a fabricar carros de rua em série apenas em 2010 — e trouxe para eles a obsessão por leveza da competição.',
		origem:
			'Bruce McLaren, piloto neozelandês, fundou sua equipe de corrida em 1963, na Inglaterra. O carro de rua veio muito depois: o McLaren F1 dos anos 1990 foi produzido em série mínima, e só em 2010 a McLaren Automotive passou a fabricar carros de rua de forma continuada. A sede fica em Woking, no Reino Unido.',
		identidade:
			'A marca é a mais diretamente ligada à engenharia de competição entre as fabricantes de superesportivos. O uso de estrutura monocoque em fibra de carbono em toda a linha, e não apenas nos modelos de topo, é a expressão mais concreta disso: vem da lógica de Fórmula 1, em que rigidez e peso definem tudo. É também a marca que menos investe em SUV — a linha permanece concentrada em esportivos de motor central.',
		noBrasil:
			'Marca de presença recente e frota pequena no Brasil. Isso significa exemplares raros e, na prática, uma rede de assistência mais restrita do que a das marcas alemãs — algo a considerar antes da compra, não depois.',
		oQueVerificar: [
			'Histórico completo de manutenção, ainda mais relevante numa marca de frota pequena e rede de assistência restrita no país.',
			'Documentação de importação coerente com o chassi.',
			'Estado dos componentes hidráulicos da suspensão nos modelos que usam esse sistema, por serem específicos da marca.',
			'Sinais de uso em pista, frequentes nesta marca pelo perfil do comprador.',
			'Disponibilidade de peça e prazo de atendimento antes de fechar negócio, e não depois.',
		],
		perguntas: [
			{
				pergunta: 'McLaren tem assistência técnica no Brasil?',
				resposta:
					'A presença da marca no país é recente e mais restrita que a das marcas alemãs. Confirme a cobertura de serviço para o modelo específico antes da compra — é um fator de custo e de tempo de imobilização relevante.',
			},
			{
				pergunta: 'O que diferencia uma McLaren de uma Ferrari ou Lamborghini?',
				resposta:
					'A McLaren enfatiza engenharia e leveza — estrutura em fibra de carbono em toda a linha — enquanto a Ferrari se apoia no histórico de competição e a Lamborghini, no design e na presença. São três respostas diferentes para a mesma pergunta.',
			},
		],
	},

	'aston-martin': {
		titulo: 'Aston Martin: história, modelos e o que saber antes de comprar',
		resumo:
			'Mais de um século construindo gran turismos ingleses em que o acabamento pesa tanto quanto o desempenho.',
		origem:
			'Fundada em 1913 por Lionel Martin e Robert Bamford, em Londres. O nome combina o sobrenome de um dos fundadores com Aston Clinton, subida de montanha onde a dupla competia. A sede fica em Gaydon, na Inglaterra. A marca atravessou o século com várias mudanças de controle acionário e períodos de dificuldade financeira — parte da sua história, e um dos motivos da produção historicamente pequena.',
		identidade:
			'A Aston Martin ocupa um lugar próprio: gran turismo de motor dianteiro, com foco em viagem confortável e acabamento artesanal, e não em número de pista. É a marca em que couro, madeira e ajuste manual pesam na proposta tanto quanto a mecânica. A associação com o cinema britânico deu à marca um reconhecimento cultural desproporcional ao seu tamanho industrial.',
		noBrasil:
			'Frota pequena e todos os exemplares importados. Como em toda marca de baixo volume no país, a verificação de documentação de importação e a checagem prévia de disponibilidade de peça são parte da decisão de compra.',
		oQueVerificar: [
			'Documentação de importação completa e coerente com o chassi.',
			'Histórico de manutenção e a existência de oficina capaz de atender o modelo na região onde o carro vai rodar.',
			'Estado do acabamento interno, que é o ponto forte da marca e o mais caro de recuperar — couro, madeira e revestimentos.',
			'Em carros de baixa rodagem, o vencimento de fluidos e borrachas por tempo.',
			'Coerência da configuração de fábrica, considerando o grau de personalização que a marca oferece.',
		],
		perguntas: [
			{
				pergunta: 'Aston Martin é um esportivo ou um gran turismo?',
				resposta:
					'A linha principal é de gran turismos: carros de motor dianteiro pensados para viajar com conforto e desempenho, não para o menor tempo de volta. A marca também tem modelo esportivo mais focado e um SUV, mas a identidade histórica é a do GT.',
			},
			{
				pergunta: 'Vale a pena comprar Aston Martin no Brasil?',
				resposta:
					'Faz sentido para quem valoriza exclusividade e acabamento, e aceita a contrapartida de uma frota pequena: menos oficinas, prazos maiores de peça e revenda mais lenta por haver menos compradores.',
			},
		],
	},

	bmw: {
		titulo: 'BMW: história, divisão M e o que saber antes de comprar',
		resumo:
			'Começou fabricando motores de avião e construiu a identidade de marca premium em torno de uma ideia: o carro é do motorista, não do passageiro.',
		origem:
			'A BMW nasceu em Munique em 1916, fabricando motores de aeronaves — origem que a hélice estilizada do emblema evoca. A produção de automóveis veio na década de 1920. A divisão de alto desempenho, BMW M, foi criada em 1972 e começou pela competição antes de assinar modelos de rua.',
		identidade:
			'A BMW consolidou a ideia de sedã premium com dinâmica de esportivo, e é a marca alemã historicamente mais associada à tração traseira e à distribuição equilibrada de peso. A divisão M é o que dá à marca presença legítima na conversa sobre performance: são versões desenvolvidas separadamente, não pacotes estéticos.',
		noBrasil:
			'A BMW tem presença consolidada no Brasil, incluindo fábrica em Araquari, em Santa Catarina, que monta parte da linha vendida no país. Isso significa rede ampla de assistência e peça mais acessível que a de marcas sem representação — e também que convivem no mercado exemplares de origem nacional e importada.',
		oQueVerificar: [
			'Se o exemplar é de produção nacional ou importado, o que afeta disponibilidade de peça e valor de revenda.',
			'Histórico de revisões na rede, com atenção aos intervalos variáveis que a marca adota conforme o uso.',
			'Nos modelos M, sinais de uso em pista e o estado de freios, pneus e fluidos.',
			'Estado do sistema de arrefecimento e de vedações em motores turbo com mais quilometragem.',
			'Coerência do pacote de opcionais com a nota fiscal, dado o peso deles na formação de preço da marca.',
		],
		perguntas: [
			{
				pergunta: 'Qual a diferença entre um BMW M e uma versão com pacote M Sport?',
				resposta:
					'O M Sport é um pacote de aparência e acabamento — rodas, para-choques, bancos, volante. Os modelos M são desenvolvidos pela divisão de alto desempenho, com motor, suspensão, freios e transmissão próprios. São coisas diferentes, e a diferença aparece no preço e na revenda.',
			},
			{
				pergunta: 'BMW é caro de manter no Brasil?',
				resposta:
					'É mais caro que um carro de marca generalista, mas menos que marcas premium sem produção ou rede local. A presença de fábrica e rede ampla no país reduz prazo e custo de peça em comparação a marcas de baixo volume.',
			},
		],
	},

	'mercedes-benz': {
		titulo: 'Mercedes-Benz: história, AMG e o que saber antes de comprar',
		resumo:
			'A marca que reivindica a invenção do automóvel e construiu a referência do que é um carro de luxo.',
		origem:
			'A história começa antes da marca: Carl Benz patenteou em 1886 o veículo que é normalmente reconhecido como o primeiro automóvel. A Mercedes-Benz como nome surge em 1926, da fusão entre a Daimler-Motoren-Gesellschaft e a Benz & Cie. A sede fica em Stuttgart. A AMG nasceu separada, em 1967, criada por dois ex-engenheiros da Daimler, e mudou-se para Affalterbach na década seguinte — endereço que virou sinônimo da divisão. A incorporação pela montadora veio bem depois.',
		identidade:
			'A Mercedes-Benz é a referência histórica de conforto e tecnologia embarcada no segmento de luxo — a marca que tradicionalmente estreia sistemas de segurança e assistência que depois se espalham pela indústria. A AMG acrescentou a essa base uma linha de alto desempenho com identidade própria, incluindo a tradição de motor montado por um único técnico.',
		noBrasil:
			'Presença antiga e consolidada, com forte histórico no segmento de caminhões e ônibus além dos automóveis. A rede de assistência é ampla, e há tanto exemplares importados quanto modelos montados localmente ao longo das décadas.',
		oQueVerificar: [
			'Histórico de revisões na rede, especialmente em modelos com sistemas eletrônicos de assistência mais complexos.',
			'Estado da suspensão pneumática nos modelos equipados com ela — é o item que mais pesa quando falha.',
			'Nos AMG, sinais de uso severo e o estado de freios, pneus e fluidos.',
			'Funcionamento completo da eletrônica embarcada, item por item, dado o volume de sistemas nos modelos recentes.',
			'Coerência entre a versão declarada e o que o carro realmente tem, já que a marca trabalha com muitas variações de acabamento.',
		],
		perguntas: [
			{
				pergunta: 'O que significa AMG numa Mercedes-Benz?',
				resposta:
					'AMG é a divisão de alto desempenho da marca. Nos modelos AMG completos, motor, suspensão, freios e transmissão são desenvolvidos por ela. Há também versões intermediárias, com parte do tratamento AMG — vale confirmar exatamente qual é a versão do exemplar.',
			},
			{
				pergunta: 'Suspensão pneumática de Mercedes dá problema?',
				resposta:
					'É um sistema que entrega conforto superior e, como todo componente de desgaste, tem vida útil. Num carro usado, testar o funcionamento em todos os modos e verificar se há histórico de reparo é parte obrigatória da avaliação.',
			},
		],
	},

	audi: {
		titulo: 'Audi: história, quattro e o que saber antes de comprar',
		resumo:
			'Os quatro anéis vêm da união de quatro fabricantes — e a marca construiu sua identidade moderna sobre a tração integral.',
		origem:
			'August Horch fundou em 1909 a empresa que viraria Audi. Os quatro anéis do emblema representam a Auto Union, criada em 1932 pela união de quatro fabricantes alemãs. A sede fica em Ingolstadt. O marco moderno da marca é o sistema de tração integral quattro, apresentado em 1980 e consagrado na competição de rali.',
		identidade:
			'A Audi ocupa na tríade alemã o lugar da tecnologia e do design sóbrio: menos focada na dinâmica de tração traseira que a BMW, menos ligada ao luxo tradicional que a Mercedes-Benz. A tração integral é o traço técnico que a define, e a linha de alto desempenho leva as letras S e RS.',
		noBrasil:
			'Presença consolidada, com rede de assistência ampla e histórico de produção local em determinados períodos. Como no caso da BMW, convivem exemplares de origem nacional e importada, e isso influencia peça e revenda.',
		oQueVerificar: [
			'Histórico de revisões na rede e o estado dos componentes do sistema de tração integral.',
			'Nos modelos S e RS, sinais de uso severo em freios, pneus, embreagem e fluidos.',
			'Estado do sistema de arrefecimento e de vedações nos motores turbo com mais rodagem.',
			'Funcionamento da eletrônica de bordo e dos sistemas de assistência, item por item.',
			'Se o exemplar é nacional ou importado, pelo efeito em prazo de peça e revenda.',
		],
		perguntas: [
			{
				pergunta: 'O que é o sistema quattro da Audi?',
				resposta:
					'É o nome comercial da tração integral da marca, apresentado em 1980. Ao longo das décadas a Audi usou implementações técnicas diferentes sob o mesmo nome, conforme a plataforma do modelo — o nome é o mesmo, a engenharia por trás nem sempre.',
			},
			{
				pergunta: 'Qual a diferença entre as versões S e RS da Audi?',
				resposta:
					'Ambas são de alto desempenho, com as RS acima das S em potência e preparação. As duas se distinguem das versões com pacote de aparência, que mudam o visual sem alterar a mecânica.',
			},
		],
	},

	chevrolet: {
		titulo: 'Chevrolet: história, Corvette e o que saber antes de comprar',
		resumo:
			'Marca de volume nascida em Detroit que abriga, na mesma linha, o esportivo americano mais longevo da história.',
		origem:
			'Fundada em 1911 por Louis Chevrolet, piloto suíço, e William Durant, em Detroit. Integrou-se à General Motors poucos anos depois. O Corvette, apresentado em 1953, permanece em produção desde então — o esportivo americano de linha mais duradoura — e mudou de arquitetura na geração atual, com o motor passando para trás do motorista.',
		identidade:
			'A Chevrolet é, no essencial, uma marca de volume — e é justamente isso que torna o Corvette peculiar: um esportivo de desempenho comparável ao das marcas europeias, produzido em escala industrial e vendido por preço estruturalmente menor. É a proposta oposta à da exclusividade italiana ou inglesa.',
		noBrasil:
			'A Chevrolet tem produção e rede nacionais de longa data, mas isso vale para a linha de volume. O Corvette e os demais modelos de performance são importados, com frota pequena — e a rede de assistência para eles é bem mais restrita do que a da marca em geral.',
		oQueVerificar: [
			'Não presuma que a rede nacional da marca atende os modelos de performance importados — confirme a oficina capaz de atender o modelo específico.',
			'Documentação de importação completa e coerente com o chassi.',
			'Sinais de uso em pista, frequentes em esportivos americanos pelo custo de manutenção mais acessível.',
			'Alterações de motor e escapamento, comuns nesse nicho e relevantes para procedência e revenda.',
			'Estado de embreagem, freios e pneus, itens de desgaste que o perfil de uso desses carros acelera.',
		],
		perguntas: [
			{
				pergunta: 'O Corvette tem assistência na rede Chevrolet do Brasil?',
				resposta:
					'A rede nacional da marca atende principalmente a linha produzida no país. Para modelos de performance importados, a cobertura é mais restrita e precisa ser confirmada por modelo e por região antes da compra.',
			},
			{
				pergunta: 'Corvette é um esportivo comparável aos europeus?',
				resposta:
					'Em desempenho, as gerações recentes são comparáveis a esportivos europeus de preço bem mais alto. A diferença está na exclusividade, no acabamento e na rede de assistência — e é isso que explica a diferença de preço.',
			},
		],
	},

	'land-rover': {
		titulo: 'Land Rover: história, linha atual e o que saber antes de comprar',
		resumo:
			'Nasceu como veículo de trabalho para o campo inglês do pós-guerra e acabou criando, décadas depois, a categoria do utilitário de luxo.',
		origem:
			'O primeiro Land Rover foi apresentado em 1948 pela Rover Company, na Inglaterra, como veículo utilitário para uso agrícola — carroceria de alumínio, mecânica simples e tração nas quatro rodas. A fábrica de Solihull produz a marca desde então. O Range Rover, de 1970, foi o ponto de virada: manteve a capacidade fora de estrada e acrescentou conforto de carro de passeio. A marca pertence hoje ao grupo indiano Tata Motors, que a adquiriu em 2008.',
		identidade:
			'A Land Rover é a marca que atravessou a distância mais longa dentro da própria história: do utilitário de fazenda ao utilitário de luxo, sem abandonar a capacidade fora de estrada como argumento. Diferentemente de concorrentes que fazem SUVs sobre plataforma de carro de passeio, a marca mantém sistemas de tração e de controle de terreno que existem para uso real fora do asfalto — mesmo em exemplares que nunca vão sair dele.',
		noBrasil:
			'A marca tem presença oficial consolidada no país e chegou a manter produção local em Itatiaia, no Rio de Janeiro. Isso significa rede de assistência ampla em comparação com marcas importadas de baixo volume, e a convivência no mercado de usados entre exemplares de origem nacional e importada.',
		oQueVerificar: [
			'Estado da suspensão pneumática, presente em boa parte da linha — é o item que mais pesa quando falha e o primeiro a testar em todos os modos de altura.',
			'Histórico de revisões na rede, com atenção ao sistema elétrico e aos módulos eletrônicos, numerosos nos modelos recentes.',
			'Sinais de uso fora de estrada de verdade: proteções inferiores, estado do assoalho, e não apenas a aparência da carroceria.',
			'Se o exemplar é de produção nacional ou importado, pelo efeito em prazo de peça e em revenda.',
			'Funcionamento completo dos sistemas de controle de terreno e de tração, item por item, e não só num teste de rua.',
		],
		perguntas: [
			{
				pergunta: 'Land Rover dá muito problema?',
				resposta:
					'A marca carrega fama de manutenção exigente, concentrada em suspensão pneumática e eletrônica. Num exemplar usado, o que separa um bom carro de um problema é o histórico de manutenção documentado — mais do que a quilometragem ou o ano.',
			},
			{
				pergunta: 'Qual a diferença entre Land Rover e Range Rover?',
				resposta:
					'Land Rover é a marca; Range Rover é a linha de topo dela, criada em 1970. Hoje a fabricante trata Range Rover quase como marca própria, com modelos que vão do Evoque ao Range Rover de tamanho integral.',
			},
			{
				pergunta: 'Land Rover é bom para uso urbano?',
				resposta:
					'Sim, e é o uso da maioria dos exemplares. Vale considerar que as dimensões e o consumo são maiores que os de um SUV médio de marca generalista, e que a suspensão pneumática exige atenção na manutenção.',
			},
		],
	},

	'range-rover': {
		titulo: 'Range Rover: história, versões e o que saber antes de comprar',
		resumo:
			'Inventou o utilitário de luxo em 1970 e segue definindo a categoria — hoje tratado pela própria fabricante quase como uma marca à parte.',
		origem:
			'O Range Rover foi lançado em 1970 pela Land Rover, na Inglaterra, com uma proposta que não existia até então: capacidade fora de estrada de utilitário somada ao conforto de um carro de passeio. Antes dele, os dois mundos não se encontravam. A linha se ramificou com o tempo — ganhou versões de porte e posicionamento diferentes — e hoje a fabricante a posiciona quase como uma marca própria dentro do grupo.',
		identidade:
			'O Range Rover é o carro que criou a categoria do SUV de luxo, e a linha manteve por décadas a mesma combinação: postura de comando, acabamento de sedã de luxo e capacidade real fora do asfalto. A silhueta de teto flutuante e a linha de cintura alta atravessaram todas as gerações, o que dá à linha uma continuidade visual rara entre utilitários.',
		noBrasil:
			'É o produto mais reconhecido da Land Rover no mercado brasileiro, com procura consistente no usado. Circulam aqui exemplares de origem nacional e importada, e as versões variam bastante em porte, motorização e preço — vale confirmar exatamente qual versão é o exemplar antes de comparar valores.',
		oQueVerificar: [
			'Estado da suspensão pneumática em todos os modos de altura — é o item de maior custo quando falha e está presente em boa parte da linha.',
			'Qual versão exatamente é o carro: a linha reúne modelos de portes e posicionamentos bem diferentes, e o nome sozinho não define o valor.',
			'Histórico de revisões documentado, com atenção especial à eletrônica e aos módulos de controle.',
			'Sinais de uso fora de estrada real, verificando proteções inferiores e assoalho, e não apenas a carroceria.',
			'Origem do exemplar, nacional ou importada, pelo efeito em prazo de peça e revenda.',
		],
		perguntas: [
			{
				pergunta: 'Range Rover é uma marca ou um modelo?',
				resposta:
					'Tecnicamente é uma linha da Land Rover, criada em 1970. Na prática, a fabricante hoje a posiciona quase como marca própria, e o mercado a trata assim — daí a linha reunir modelos bem distintos entre si.',
			},
			{
				pergunta: 'Qual a diferença entre Range Rover e Range Rover Sport?',
				resposta:
					'São modelos diferentes dentro da mesma linha. O Range Rover é o de topo, maior e mais voltado ao conforto; o Sport é mais compacto e com afinação mais voltada ao comportamento em asfalto. Confirme qual dos dois é o exemplar antes de comparar preços.',
			},
			{
				pergunta: 'Vale a pena comprar um Range Rover usado?',
				resposta:
					'Vale para quem prioriza o histórico de manutenção acima do ano e da quilometragem. A depreciação já ocorrida favorece o comprador, mas suspensão pneumática e eletrônica exigem que o exemplar tenha sido bem cuidado — sem isso, a economia na compra vira custo depois.',
			},
		],
		genero: 'm',
		linha: {
			displayName: 'Range Rover',
			country: 'Reino Unido',
			marcaBase: 'land-rover',
			filtroDeModelo: 'range rover',
		},
	},

	bentley: {
		titulo: 'Bentley: história, modelos e o que saber antes de comprar',
		resumo:
			'Nasceu vencendo provas de resistência e virou a referência de luxo britânico com motor grande e acabamento artesanal.',
		origem:
			'W. O. Bentley fundou a marca em 1919, na Inglaterra. A reputação veio da competição: os Bentley venceram as 24 Horas de Le Mans várias vezes na década de 1920. A fábrica está em Crewe desde a década de 1940. A marca pertence hoje ao grupo Volkswagen.',
		identidade:
			'A Bentley combina duas coisas que raramente convivem: motor de grande cilindrada com desempenho de esportivo, e um interior de acabamento artesanal com couro e madeira trabalhados à mão. É um gran turismo de peso e presença, projetado para atravessar distâncias em alta velocidade com conforto — não para o menor tempo de volta.',
		noBrasil:
			'Frota pequena e todos os exemplares importados. Como nas demais marcas de baixo volume no país, disponibilidade de peça e oficina capacitada devem ser confirmadas antes da compra.',
		oQueVerificar: [
			'Documentação de importação completa e coerente com o chassi.',
			'Histórico de manutenção e a existência de oficina apta a atender o modelo na região.',
			'Estado do acabamento interno — couro e madeira feitos à mão são o ponto forte da marca e o mais caro de recuperar.',
			'Estado da suspensão pneumática e do sistema de arrefecimento nos modelos equipados.',
			'Em carros de baixa rodagem, vencimento de fluidos, pneus e borrachas por tempo.',
		],
		perguntas: [
			{
				pergunta: 'Qual a diferença entre Bentley e Rolls-Royce?',
				resposta:
					'As duas marcas dividem parte da história, mas hoje pertencem a grupos diferentes e ocupam posições distintas: a Bentley enfatiza o gran turismo dirigido pelo proprietário, com desempenho; a Rolls-Royce enfatiza o carro de ser conduzido, com foco no passageiro.',
			},
			{
				pergunta: 'Bentley é caro de manter?',
				resposta:
					'Sim, e a frota pequena no Brasil acrescenta prazo de peça ao custo. Revisões, pneus e componentes de suspensão são os itens de maior peso. O histórico de manutenção do exemplar específico é o melhor indicador do custo futuro.',
			},
		],
	},
}

export function editorialDaMarca(slug: string): MarcaEditorial | undefined {
	return MARCAS_EDITORIAL[slug]
}

/**
 * Restringe o estoque da marca-base aos veículos da linha.
 *
 * Existe separado da página para poder ser testado: o estoque real hoje tem um
 * único Land Rover, e ele por acaso é um Range Rover — então a página parece
 * correta mesmo se o filtro não funcionasse. O primeiro Defender ou Discovery
 * a entrar revelaria o defeito na frente do cliente.
 *
 * Sem linha, devolve tudo: a página de marca mostra a marca inteira.
 */
export function filtrarPelaLinha<T extends { model?: string | null }>(
	veiculos: T[],
	linha: LinhaPropria | undefined,
): T[] {
	if (!linha) return veiculos
	return veiculos.filter(v => (v.model ?? '').toLowerCase().includes(linha.filtroDeModelo))
}
