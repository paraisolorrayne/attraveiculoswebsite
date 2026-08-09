/**
 * Catálogo de veículos no schema do Meta (Automotive Inventory Ads).
 *
 * NÃO é o feed do OpenAI com outro nome. O Meta usa um vocabulário próprio para
 * veículo, incompatível campo a campo com o de commerce genérico:
 *
 *   OpenAI            Meta
 *   item_id       ->  vehicle_id
 *   brand         ->  make        (e `model` e `year` são colunas separadas,
 *                                  não pedaços do título)
 *   price "X BRL" ->  price "X BRL"      (mesmo formato, por sorte)
 *   condition     ->  state_of_vehicle   (New/Used/CPO, não new/used)
 *   —             ->  body_style         (enum fechado, em inglês)
 *   —             ->  address + latitude/longitude da LOJA, obrigatórios
 *
 * Apontar o Meta para o feed do OpenAI resultaria em zero veículo importado.
 *
 * O Meta busca o arquivo por URL agendada, então basta cadastrar o endereço
 * deste endpoint — não há upload nem credencial, ao contrário do OpenAI.
 */

import { ADDRESS, GEO, SITE_URL, PHONE_NUMBER } from './constants'
import { classificarCarroceria, classificarCombustivel, type Carroceria } from './taxonomia-veiculo'
import type { Vehicle } from '@/types'

/** Máximo de imagens por veículo aceito pelo Meta. */
const MAX_IMAGENS = 20

/**
 * Carroceria para o enum do Meta.
 *
 * O enum é fechado e em inglês; qualquer valor fora dele derruba a linha na
 * importação. Como a classificação já resolveu a ambiguidade da origem, o de-
 * para é direto — inclusive para os SUVs de teto caído, que aqui entram como
 * SUV e não como COUPE.
 */
const BODY_STYLE: Record<Carroceria, string> = {
  suv: 'SUV',
  sedan: 'SEDAN',
  hatch: 'HATCHBACK',
  cupe: 'COUPE',
  conversivel: 'CONVERTIBLE',
  picape: 'TRUCK',
  perua: 'WAGON',
}

/** Combustível para o enum do Meta. */
const FUEL_TYPE: Record<string, string> = {
  gasolina: 'GASOLINE',
  diesel: 'DIESEL',
  eletrico: 'ELECTRIC',
  hibrido: 'HYBRID',
  flex: 'FLEX',
}

/**
 * Colunas do arquivo, na ordem. Os nomes com ponto e colchete são literais —
 * é assim que o Meta representa campo aninhado em CSV.
 */
export const COLUNAS_META = [
  // Obrigatórios do veículo
  'vehicle_id',
  'title',
  'description',
  'url',
  'make',
  'model',
  'year',
  'mileage.value',
  'mileage.unit',
  'price',
  'body_style',
  'state_of_vehicle',
  'exterior_color',
  // Opcionais que temos com dado real
  'trim',
  'transmission',
  'fuel_type',
  'availability',
  // Obrigatórios da concessionária
  'address.addr1',
  'address.city',
  'address.region',
  'address.country',
  'address.postal_code',
  'latitude',
  'longitude',
  // Opcionais da concessionária
  'dealer_name',
  'dealer_phone',
  // Imagens
  ...Array.from({ length: MAX_IMAGENS }, (_, i) => `image[${i}].url`),
] as const

export type ColunaMeta = (typeof COLUNAS_META)[number]

/**
 * Escapa uma célula de CSV conforme RFC 4180.
 *
 * CSV e não TSV aqui porque é o formato dos exemplos do Meta e o que a busca
 * agendada reconhece com mais folga. Descrição de veículo tem vírgula, então o
 * escape com aspas não é detalhe: sem ele as colunas desalinham e a importação
 * atribui o texto errado ao campo errado.
 */
function celula(valor: unknown): string {
  if (valor == null) return ''
  const texto = String(valor).replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
  if (!texto) return ''
  return /[",]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

function transmissao(valor: string | null | undefined): string {
  const t = (valor ?? '').toLowerCase()
  if (t.includes('manual')) return 'Manual'
  if (t.includes('autom')) return 'Automatic'
  return ''
}

export interface ProblemaMeta {
  vehicleId: string
  campo: string
  motivo: string
}

export interface FeedMetaGerado {
  csv: string
  linhas: number
  recusados: ProblemaMeta[]
}

type LinhaOuProblema =
  | { ok: true; valores: Record<string, string> }
  | { ok: false; problema: ProblemaMeta }

function linhaDoVeiculo(veiculo: Vehicle): LinhaOuProblema {
  const id = String(veiculo.id ?? '').trim()
  const fotos = (veiculo.photos ?? []).filter(f => f?.startsWith('https://')).slice(0, MAX_IMAGENS)

  const carrocerias = classificarCarroceria({
    carroceria: veiculo.body_type,
    marca: veiculo.brand,
    modelo: veiculo.model,
    versao: veiculo.version,
    portas: veiculo.doors,
  })
  const bodyStyle = carrocerias.length > 0 ? BODY_STYLE[carrocerias[0]] : 'OTHER'

  const titulo = [veiculo.year_model, veiculo.brand, veiculo.model, veiculo.version]
    .filter(Boolean)
    .join(' ')

  // O Meta recusa a linha inteira quando falta obrigatório, e um catálogo com
  // linha recusada aparece como "importado com erros" sem dizer qual carro. Sai
  // daqui antes, com o motivo no log.
  const faltando: Array<[string, unknown]> = [
    ['vehicle_id', id],
    ['title', titulo],
    ['description', veiculo.description],
    ['make', veiculo.brand],
    ['model', veiculo.model],
    ['year', veiculo.year_model],
    ['exterior_color', veiculo.color],
    ['image[0].url', fotos[0]],
  ]
  for (const [campo, valor] of faltando) {
    if (!valor) return { ok: false, problema: { vehicleId: id || '(sem id)', campo, motivo: 'obrigatório vazio' } }
  }
  if (!(veiculo.price > 0)) {
    return { ok: false, problema: { vehicleId: id, campo: 'price', motivo: `preço inválido: ${veiculo.price}` } }
  }
  if (!veiculo.slug) {
    return { ok: false, problema: { vehicleId: id, campo: 'url', motivo: 'sem slug — a URL não resolveria' } }
  }

  const valores: Record<string, string> = {
    vehicle_id: id,
    title: titulo.slice(0, 500),
    description: String(veiculo.description).slice(0, 5000),
    url: `${SITE_URL}/veiculo/${veiculo.slug}`,
    make: veiculo.brand,
    model: veiculo.model,
    year: String(veiculo.year_model),
    'mileage.value': String(Math.max(0, Math.round(veiculo.mileage ?? 0))),
    'mileage.unit': 'KM',
    // "custo, espaço, código ISO da moeda" — mesmo formato do outro feed.
    price: `${veiculo.price.toFixed(2)} BRL`,
    body_style: bodyStyle,
    // Caixa exata do enum do Meta: New / Used / CPO. Não usamos CPO: a Attra
    // tem curadoria própria, mas "certified pre-owned" é um programa de
    // fabricante, e reivindicá-lo seria afirmar uma certificação que não existe.
    state_of_vehicle: veiculo.is_new ? 'New' : 'Used',
    exterior_color: veiculo.color,

    trim: (veiculo.version ?? '').slice(0, 50),
    transmission: transmissao(veiculo.transmission),
    fuel_type: FUEL_TYPE[classificarCombustivel(veiculo.fuel_type) ?? ''] ?? '',
    availability: veiculo.status === 'sold' ? 'not_available' : 'available',

    'address.addr1': ADDRESS.street,
    'address.city': ADDRESS.city,
    'address.region': ADDRESS.state,
    'address.country': ADDRESS.country,
    'address.postal_code': ADDRESS.postalCode,
    latitude: String(GEO.latitude),
    longitude: String(GEO.longitude),

    dealer_name: 'Attra Veículos',
    // Com código do país: é o que faz o botão de ligar aparecer no anúncio.
    dealer_phone: PHONE_NUMBER,
  }

  fotos.forEach((url, i) => {
    valores[`image[${i}].url`] = url
  })

  return { ok: true, valores }
}

export function gerarFeedMeta(veiculos: Vehicle[]): FeedMetaGerado {
  const recusados: ProblemaMeta[] = []
  const linhas: string[] = [COLUNAS_META.join(',')]

  for (const veiculo of veiculos) {
    const resultado = linhaDoVeiculo(veiculo)
    if (!resultado.ok) {
      recusados.push(resultado.problema)
      continue
    }
    linhas.push(COLUNAS_META.map(c => celula(resultado.valores[c])).join(','))
  }

  return { csv: linhas.join('\n') + '\n', linhas: linhas.length - 1, recusados }
}
