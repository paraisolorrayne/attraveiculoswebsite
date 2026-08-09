/**
 * Feed de produtos — linha por veículo, no formato que o OpenAI Commerce aceita.
 *
 * A especificação (developers.openai.com/commerce/specs/file-upload/products)
 * aceita SÓ arquivo delimitado: .txt/.tsv/.csv, UTF-8, uma linha de cabeçalho
 * em minúsculas com underscore, um produto por linha. Diz explicitamente que
 * não aceita JSON, XML, RSS nem Atom — por isso nem o `/api/llm/vehicles`
 * (JSON-LD) nem o `/api/feed/estoque` (RSS) servem para o upload, por mais
 * completos que estejam.
 *
 * TSV e não CSV de propósito: descrição de veículo tem vírgula com frequência e
 * não tem tabulação nunca. Trocar o delimitador elimina a classe inteira de bug
 * de aspas mal escapadas.
 */

import { SITE_URL } from './constants'
import type { Vehicle } from '@/types'

/**
 * Constantes da loja. Não vêm do estoque — são as mesmas para toda linha, e
 * várias são obrigatórias pela especificação.
 */
const LOJA = {
  nome: 'Attra Veículos',
  url: SITE_URL,
  /** ISO 3166-1 alfa-2. Obrigatórios: `target_countries` e `store_country`. */
  pais: 'BR',
  moeda: 'BRL',
  /**
   * Taxonomia do Google, que a especificação usa com `>` como separador.
   * Todo o estoque é automóvel; não há caso que fuja disto.
   */
  categoria: 'Vehicles & Parts > Vehicles > Motor Vehicles > Cars, Trucks & Vans',
} as const

/**
 * Colunas publicadas, na ordem do arquivo.
 *
 * Só entra coluna que temos como preencher com dado real. Coluna presente e
 * vazia é pior que coluna ausente: sinaliza que o dado existe e falhou.
 */
export const COLUNAS = [
  // Elegibilidade
  'is_eligible_search',
  'is_eligible_checkout',
  'is_ads_eligible',
  // Obrigatórios
  'item_id',
  'title',
  'description',
  'url',
  'brand',
  'image_url',
  'price',
  'availability',
  // Identificação
  'identifier_exists',
  'condition',
  'product_category',
  // Mídia e atributos
  'additional_image_urls',
  'color',
  // Loja
  'seller_name',
  'seller_url',
  'target_countries',
  'store_country',
  // Correlação com a conversão
  'ads_metadata',
] as const

export type Coluna = (typeof COLUNAS)[number]

/**
 * Limites de tamanho da especificação. Truncar é melhor que ser recusado, mas
 * truncar em silêncio esconde um dado ruim — quem trunca reporta.
 */
const LIMITES: Partial<Record<Coluna, number>> = {
  item_id: 100,
  title: 150,
  description: 5000,
  brand: 70,
  seller_name: 70,
  color: 40,
}

/**
 * Limpa um valor para caber numa célula TSV.
 *
 * Tabulação e quebra de linha viram espaço: são os dois caracteres que
 * quebrariam o formato, e nenhum dos dois carrega significado num campo de
 * catálogo.
 */
function celula(valor: unknown): string {
  if (valor == null) return ''
  return String(valor).replace(/[\t\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

/** Preço no formato "número + moeda ISO-4217" que a especificação exige. */
function preco(valor: number): string {
  return `${valor.toFixed(2)} ${LOJA.moeda}`
}

/**
 * Estado do anúncio no vocabulário da especificação.
 * `reserved` continua vendável até fechar, então segue como disponível.
 */
function disponibilidade(status: Vehicle['status']): string {
  switch (status) {
    case 'available':
    case 'highlight':
    case 'reserved':
      return 'in_stock'
    default:
      return 'out_of_stock'
  }
}

export interface ProblemaDeLinha {
  itemId: string
  campo: Coluna
  motivo: string
}

export interface FeedGerado {
  tsv: string
  linhas: number
  /** Veículos recusados por faltar campo obrigatório. */
  recusados: ProblemaDeLinha[]
  /** Valores cortados por limite de tamanho. */
  truncados: ProblemaDeLinha[]
}

/**
 * Monta a linha de um veículo, ou devolve o motivo de ele não entrar.
 *
 * Recusa a linha inteira quando falta obrigatório em vez de publicar com o
 * campo vazio: a especificação valida por amostragem, e uma linha incompleta
 * pode derrubar o arquivo todo em vez de só o item.
 */
function linhaDoVeiculo(
  veiculo: Vehicle,
  truncados: ProblemaDeLinha[],
): { valores: Record<Coluna, string> } | { erro: ProblemaDeLinha } {
  const itemId = celula(veiculo.id)
  const url = `${LOJA.url}/veiculo/${veiculo.slug}`
  const fotos = (veiculo.photos ?? []).filter(f => f?.startsWith('https://'))
  const titulo = celula(
    [veiculo.brand, veiculo.model, veiculo.version, veiculo.year_model]
      .filter(Boolean)
      .join(' '),
  )

  const obrigatorios: Array<[Coluna, string]> = [
    ['item_id', itemId],
    ['title', titulo],
    ['description', celula(veiculo.description)],
    ['brand', celula(veiculo.brand)],
    ['image_url', fotos[0] ?? ''],
  ]
  for (const [campo, valor] of obrigatorios) {
    if (!valor) {
      return { erro: { itemId: itemId || '(sem id)', campo, motivo: 'obrigatório vazio' } }
    }
  }
  if (!(veiculo.price > 0)) {
    return { erro: { itemId, campo: 'price', motivo: `preço inválido: ${veiculo.price}` } }
  }
  if (!veiculo.slug) {
    return { erro: { itemId, campo: 'url', motivo: 'sem slug — a URL não resolveria' } }
  }

  const valores: Record<Coluna, string> = {
    is_eligible_search: 'true',
    // Não há carrinho no site: a compra acontece no atendimento. Com checkout
    // ligado a especificação passaria a exigir política de devolução,
    // privacidade e termos — nenhuma delas publicada hoje.
    is_eligible_checkout: 'false',
    is_ads_eligible: 'true',

    item_id: itemId,
    title: titulo,
    description: celula(veiculo.description),
    url,
    brand: celula(veiculo.brand),
    image_url: fotos[0],
    price: preco(veiculo.price),
    availability: disponibilidade(veiculo.status),

    // Carro usado não tem GTIN nem MPN. A especificação exige identificador a
    // menos que a ausência seja declarada — declarar é o correto aqui. O chassi
    // serviria tecnicamente como `mpn`, mas publicá-lo num catálogo é exposição
    // sem contrapartida.
    identifier_exists: 'no',
    condition: veiculo.is_new ? 'new' : 'used',
    product_category: LOJA.categoria,

    additional_image_urls: fotos.slice(1).join(','),
    color: celula(veiculo.color),

    seller_name: LOJA.nome,
    seller_url: LOJA.url,
    target_countries: LOJA.pais,
    store_country: LOJA.pais,

    // Só chaves e valores string, como a especificação pede. Carrega o MESMO
    // id que a conversão de WhatsApp manda em `content_id` — é o que permite
    // ligar gasto de mídia a interesse por veículo.
    ads_metadata: JSON.stringify({ vehicle_id: itemId, category: veiculo.category ?? '' }),
  }

  for (const [campo, limite] of Object.entries(LIMITES) as Array<[Coluna, number]>) {
    const valor = valores[campo]
    if (valor.length > limite) {
      truncados.push({
        itemId,
        campo,
        motivo: `${valor.length} caracteres, limite ${limite}`,
      })
      valores[campo] = valor.slice(0, limite).trim()
    }
  }

  return { valores }
}

/** Gera o arquivo inteiro a partir do estoque já carregado. */
export function gerarFeed(veiculos: Vehicle[]): FeedGerado {
  const recusados: ProblemaDeLinha[] = []
  const truncados: ProblemaDeLinha[] = []
  const linhas: string[] = [COLUNAS.join('\t')]

  for (const veiculo of veiculos) {
    const resultado = linhaDoVeiculo(veiculo, truncados)
    if ('erro' in resultado) {
      recusados.push(resultado.erro)
      continue
    }
    linhas.push(COLUNAS.map(c => resultado.valores[c]).join('\t'))
  }

  return {
    tsv: linhas.join('\n') + '\n',
    linhas: linhas.length - 1,
    recusados,
    truncados,
  }
}
