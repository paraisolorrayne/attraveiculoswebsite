/**
 * Traduz a taxonomia do AutoConf para as categorias que o site filtra.
 *
 * Existe porque os rótulos da origem não batem com as opções do seletor, e a
 * comparação por `includes` que havia antes falhava em silêncio — filtro
 * devolvendo zero resultado parece "não temos esse carro", não parece defeito.
 * Medido no estoque de 08/08/2026, com 71 veículos:
 *
 *   Sedã ...... 0 de 9    'Sedã' perde o acento e vira 'seda'; a opção é 'sedan'
 *   Híbrido ... 0 de 23   o AutoConf escreve 'Gasolina e Elétrico', nunca 'Híbrido'
 *   Cupê ...... 0         'Conversível/Cupê' vira 'conversivelcupe'; a opção é 'coupe'
 *   Land Rover  0 de 6    'land-rover' vira 'landrover'; a marca vira 'land rover'
 *
 * As duas UIs de filtro mandam valores diferentes no mesmo parâmetro
 * (`carroceria=coupe` em vehicle-filters, `carroceria=Cupê` em advanced-filters).
 * Por isso a normalização vale para os DOIS lados: rótulo da origem e valor do
 * filtro passam pela mesma função antes de comparar.
 */

export type Carroceria =
  | 'suv'
  | 'sedan'
  | 'hatch'
  | 'cupe'
  | 'conversivel'
  | 'picape'
  | 'perua'

export type Combustivel = 'gasolina' | 'diesel' | 'flex' | 'hibrido' | 'eletrico'

/**
 * Reduz um texto à sua chave comparável: sem acento, sem caixa, sem separador.
 *
 * Diferente do `normalizeText` da listagem, remove TAMBÉM o espaço. Era esse o
 * furo do filtro de marca: ele tirava o hífen mas mantinha o espaço, então
 * 'land-rover' virava 'landrover' e 'Land Rover' virava 'land rover', e os dois
 * nunca se encontravam.
 */
export function chaveDeComparacao(texto: string | null | undefined): string {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/** Rótulos do AutoConf e valores das duas UIs, já reduzidos a chave. */
const CARROCERIA_POR_CHAVE: Record<string, Carroceria> = {
  suvutilitarioesportivo: 'suv',
  suv: 'suv',
  seda: 'sedan',
  sedan: 'sedan',
  hatch: 'hatch',
  hatchback: 'hatch',
  picapes: 'picape',
  picape: 'picape',
  wagonperua: 'perua',
  wagon: 'perua',
  perua: 'perua',
  cupe: 'cupe',
  coupe: 'cupe',
  conversivel: 'conversivel',
}

/** Chave do balde ambíguo do AutoConf, que junta conversível e cupê. */
const BALDE_AMBIGUO = 'conversivelcupe'

/**
 * Nome de modelo cuja carroceria é invariável — não existe versão fechada.
 * Só entram placas de identidade única; nada que dependa de opcional.
 */
const SEMPRE_CONVERSIVEL = ['boxster', 'solstice', 'sl63', 'sl55', 'roadster']

const MARCADOR_CONVERSIVEL = /(cabriolet|cabrio|roadster|spyder|spider|conversivel|targa)/
const MARCADOR_CUPE = /(coupe|cupe|berlinetta|fastback)/

export interface EntradaCarroceria {
  /** `carroceria_nome` do AutoConf. */
  carroceria?: string | null
  marca?: string | null
  modelo?: string | null
  versao?: string | null
  /** `portas` do AutoConf — preenchido em 71/71 do estoque. */
  portas?: number | null
}

/**
 * Devolve as categorias em que o veículo deve aparecer.
 *
 * É uma LISTA, não um valor. Quando a origem não permite decidir entre
 * conversível e cupê, o veículo entra nos dois em vez de sumir dos dois: quem
 * filtra vê a foto e descarta em um segundo, mas um carro invisível é uma venda
 * que não acontece. Dos 71 do estoque, 5 caem nesse caso.
 */
export function classificarCarroceria(entrada: EntradaCarroceria): Carroceria[] {
  const chave = chaveDeComparacao(entrada.carroceria)

  if (chave === BALDE_AMBIGUO) return desambiguarBaldeAmbiguo(entrada)

  const direta = CARROCERIA_POR_CHAVE[chave]
  return direta ? [direta] : []
}

function desambiguarBaldeAmbiguo(entrada: EntradaCarroceria): Carroceria[] {
  // Quatro portas resolve sozinho: não existe cupê nem conversível de 4 portas.
  //
  // O AutoConf usa este balde para o SUV de teto caído — X6, X4, X2, Q8, GLE
  // Coupé, Cayenne Coupé. São 12 no estoque, e os 12 têm 4 portas. Sem esta
  // regra eles somem do filtro de SUV, que é onde o comprador procura.
  //
  // É a ÚNICA inferência deste módulo, e onde ele pode errar: um sedã-cupê de 4
  // portas (Panamera Sport Turismo, AMG GT 4 portas) cairia aqui como SUV. Hoje
  // esses vêm rotulados 'Sedã' pela origem; se um chegar por este caminho, é o
  // log abaixo que avisa.
  if ((entrada.portas ?? 0) >= 4) return ['suv']

  const texto = chaveDeComparacao(`${entrada.modelo ?? ''} ${entrada.versao ?? ''}`)

  if (MARCADOR_CONVERSIVEL.test(texto)) return ['conversivel']
  if (MARCADOR_CUPE.test(texto)) return ['cupe']
  if (SEMPRE_CONVERSIVEL.some(placa => texto.includes(placa))) return ['conversivel']

  // Nomenclatura da Ferrari: GTB é berlinetta (fechado), GTS é spider (aberto).
  // Vale só para a Ferrari — na Porsche, GTS é nível de acabamento e não diz
  // nada sobre o teto.
  if (chaveDeComparacao(entrada.marca) === 'ferrari') {
    if (texto.includes('gtb')) return ['cupe']
    if (texto.includes('gts')) return ['conversivel']
  }

  // Sem marcador nenhum: fechado.
  //
  // Não é moeda ao ar, é assimetria. Teto retrátil é argumento de venda e vai
  // para o nome do anúncio — "Cabriolet", "Spider", "Roadster", "Targa". Cupê
  // costuma não se anunciar. Então a AUSÊNCIA de marcador de teto aberto, já
  // depois das placas que são roadster por definição, é evidência de carroceria
  // fechada. A Attra conferiu os 5 casos pendentes do estoque em 09/08/2026:
  // todos fechados.
  //
  // Antes isto devolvia os dois, para o carro não sumir de nenhum filtro. Só
  // que o campo Versão do AutoConf é lista pré-selecionada, não texto livre —
  // não há como corrigir na origem, e "aparece nos dois" deixaria de ser
  // transitório para virar o estado permanente de 5 carros.
  //
  // Onde erra: roadster cujo nome não denuncia e que não esteja em
  // SEMPRE_CONVERSIVEL. É por isso que aquela lista existe — quando entrar um
  // conversível assim no estoque, o nome dele entra lá.
  return ['cupe']
}

/**
 * Categoria de combustível.
 *
 * Elétrico é 100% elétrico. Híbrido é elétrico com mais alguma coisa. Por
 * simetria, gasolina é só gasolina: antes, o filtro de gasolina devolvia 57 de
 * 71 porque somava os 22 híbridos, e o de elétrico devolvia 28 pelo mesmo
 * motivo. As categorias agora são exclusivas e somam o estoque inteiro.
 */
export function classificarCombustivel(valor: string | null | undefined): Combustivel | null {
  const chave = chaveDeComparacao(valor)
  if (!chave) return null

  if (chave.includes('hibrido')) return 'hibrido'

  const temEletrico = chave.includes('eletrico')
  const temCombustao =
    chave.includes('gasolina') ||
    chave.includes('diesel') ||
    chave.includes('flex') ||
    chave.includes('etanol') ||
    chave.includes('alcool')

  if (temEletrico) return temCombustao ? 'hibrido' : 'eletrico'
  if (chave.includes('flex')) return 'flex'
  if (chave.includes('diesel')) return 'diesel'
  if (chave.includes('gasolina')) return 'gasolina'

  return null
}

/**
 * Categoria editorial do veículo — o recorte que a listagem usa em
 * "Performance", "SUV Premium" e afins.
 *
 * Vivia duplicada em `autoconf-api` e `vehicle-inventory-data`, em duas cópias
 * que precisavam ser editadas juntas e não eram. Fica aqui, sem dependência de
 * nenhum dos dois, para não haver import circular.
 */
export function classificarCategoria(entrada: {
  marca: string
  carrocerias: Carroceria[]
  preco: number
}): string {
  // A marca RESOLVIDA. Com `marca_nome` cru, o campo vem nulo em parte do
  // estoque, nenhuma regra de marca dispara e o veículo cai direto na regra de
  // preço — a menos informada de todas. Era o caso do GLE 63s, que virava
  // 'luxury' por custar mais de 500 mil em vez de 'premium' por ser Mercedes.
  const marca = entrada.marca.toLowerCase()

  const superesportivas = ['ferrari', 'lamborghini', 'mclaren', 'bugatti', 'pagani', 'koenigsegg']
  if (superesportivas.some(m => marca.includes(m))) return 'supercar'

  const esportivas = ['porsche', 'aston martin', 'maserati', 'lotus']
  if (esportivas.some(m => marca.includes(m))) return 'sports'

  const luxo = ['bentley', 'rolls-royce', 'maybach']
  if (luxo.some(m => marca.includes(m))) return 'luxury'

  const premium = ['bmw', 'mercedes', 'audi', 'lexus', 'land rover', 'range rover', 'jaguar', 'volvo']
  if (premium.some(m => marca.includes(m))) return 'premium'

  // Pela carroceria já classificada: o rótulo cru marca os 12 SUVs de teto
  // caído como 'Conversível/Cupê', e eles nunca chegavam a esta linha.
  if (entrada.carrocerias.includes('suv')) return 'suv'

  if (entrada.preco >= 500000) return 'luxury'
  if (entrada.preco >= 200000) return 'premium'

  return 'executive'
}

const ROTULO_POR_CARROCERIA: Record<Carroceria, string> = {
  suv: 'SUV',
  sedan: 'Sedã',
  hatch: 'Hatch',
  cupe: 'Cupê',
  conversivel: 'Conversível',
  picape: 'Picape',
  perua: 'Perua',
}

/**
 * Rótulo para exibir na ficha, no JSON-LD e no feed.
 *
 * Recebe o que `classificarCarroceria` devolveu e o rótulo cru como rede de
 * segurança: se a origem mandar uma carroceria que ainda não conhecemos, a
 * classificação vem vazia e é melhor repetir o texto original do que apagar um
 * dado que existia.
 *
 * Nos 5 casos que a origem não permite decidir, o rótulo assume a dúvida em vez
 * de escolher — dizer "Conversível" num carro que pode ser cupê seria inventar
 * especificação, que é pior que admitir a imprecisão.
 */
export function rotuloDeCarroceria(
  categorias: Carroceria[],
  rotuloCru?: string | null,
): string {
  if (categorias.length === 0) return (rotuloCru ?? '').trim()
  if (categorias.length === 1) return ROTULO_POR_CARROCERIA[categorias[0]]
  return categorias.map(c => ROTULO_POR_CARROCERIA[c]).join(' / ')
}

/** Traduz o valor que veio do seletor para a categoria canônica. */
export function carroceriaDoFiltro(valor: string | null | undefined): Carroceria | null {
  return CARROCERIA_POR_CHAVE[chaveDeComparacao(valor)] ?? null
}

/** Idem para combustível — as duas UIs mandam 'hibrido' e 'Híbrido'. */
export function combustivelDoFiltro(valor: string | null | undefined): Combustivel | null {
  const chave = chaveDeComparacao(valor)
  const validos: Combustivel[] = ['gasolina', 'diesel', 'flex', 'hibrido', 'eletrico']
  return validos.find(v => v === chave) ?? null
}

/**
 * Compara marca do veículo com o valor do filtro.
 *
 * Marca vazia NUNCA casa. Era esse o bug do Cybertruck aparecendo em todas as
 * marcas: a regra anterior aceitava `filtro.includes(marca)`, e `includes('')`
 * é verdadeiro para qualquer filtro.
 */
export function marcaCasaComFiltro(
  marcaDoVeiculo: string | null | undefined,
  filtro: string | null | undefined,
): boolean {
  const marca = chaveDeComparacao(marcaDoVeiculo)
  const alvo = chaveDeComparacao(filtro)
  if (!marca || !alvo) return false
  return marca.includes(alvo) || alvo.includes(marca)
}
