/**
 * Catálogo de PRODUTO do Meta (Commerce), para o WhatsApp.
 *
 * O WhatsApp não aceita o catálogo de veículos (Automotive Inventory Ads) que
 * o `/api/feed/meta` alimenta — só catálogo de e-commerce. Então os mesmos
 * carros saem aqui no vocabulário de produto:
 *
 *   Veículos (feed-meta)   Produto (este)
 *   vehicle_id         ->  id                     (o mesmo valor: o id da AutoConf)
 *   make               ->  brand
 *   url                ->  link
 *   image[0].url       ->  image_link
 *   image[1..].url     ->  additional_image_link  (uma célula, URLs por vírgula)
 *   state_of_vehicle   ->  condition              (new/used, minúsculo)
 *   availability       ->  availability           ("in stock", não "available")
 *
 * O `id` precisa ser o mesmo do outro catálogo e nunca mudar para o mesmo
 * carro: é por ele que o Meta reconhece o item entre uma busca e outra.
 *
 * Ao contrário do catálogo de veículos, aqui só entra carro à venda. O Meta
 * tira do catálogo o item que some do arquivo, e é assim que o vendido sai do
 * WhatsApp.
 */

import { SITE_URL } from './constants'
import { expandirAbreviacoes } from './normalizar-abreviacoes'
import type { Vehicle } from '@/types'

/** Fotos além da principal aceitas em `additional_image_link`. */
const MAX_IMAGENS_ADICIONAIS = 10

const MAX_TITULO = 150
const MAX_DESCRICAO = 5000

/** Colunas do arquivo, na ordem. */
export const COLUNAS_WHATSAPP = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'additional_image_link',
  'brand',
] as const

export type ColunaWhatsApp = (typeof COLUNAS_WHATSAPP)[number]

/**
 * Texto de origem pronto para virar catálogo: sem tag HTML e sem quebra de
 * linha. O título e a descrição aparecem no WhatsApp como texto puro, e uma
 * tag vinda do cadastro apareceria literal para o cliente.
 */
function texto(valor: unknown): string {
  if (valor == null) return ''
  return String(valor).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Escapa uma célula de CSV conforme RFC 4180: aspas em volta quando há
 * vírgula, aspas ou quebra de linha, e aspas internas dobradas.
 *
 * A célula de fotos adicionais é o caso de sempre: são várias URLs separadas
 * por vírgula, e sem as aspas cada URL viraria uma coluna.
 */
function celula(valor: string): string {
  return /[",\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor
}

/** Corta no limite sem deixar espaço sobrando no fim. */
function limitar(valor: string, maximo: number): string {
  return valor.length > maximo ? valor.slice(0, maximo).trim() : valor
}

/**
 * Versão sem o pedaço do modelo que ela repete no começo.
 *
 * O AutoConf às vezes devolve a versão começando pelo modelo inteiro (modelo
 * "Range Rover", versão "Range Rover VELAR SV") ou pelo fim dele (modelo
 * "Sierra 3500 Denali", versão "Denali Ultimate Dually"). Como o título já
 * escreve o modelo antes da versão, sem isto o cliente lê "Range Rover Range
 * Rover" no catálogo.
 */
function versaoSemRepetirModelo(modelo: string, versao: string): string {
  const palavrasModelo = modelo.toLowerCase().split(' ').filter(Boolean)
  const palavrasVersao = versao.split(' ').filter(Boolean)

  for (let n = Math.min(palavrasModelo.length, palavrasVersao.length); n > 0; n--) {
    const fimDoModelo = palavrasModelo.slice(-n).join(' ')
    const comecoDaVersao = palavrasVersao.slice(0, n).join(' ').toLowerCase()
    if (fimDoModelo === comecoDaVersao) return palavrasVersao.slice(n).join(' ')
  }
  return versao
}

/** Fabricação/modelo, como "2024/2025". Sem a fabricação, só o modelo. */
function anoModelo(veiculo: Vehicle): string {
  return [veiculo.year_manufacture, veiculo.year_model].filter(ano => ano > 0).join('/')
}

function quilometragem(veiculo: Vehicle): string {
  if (veiculo.is_new) return '0 km'
  return veiculo.mileage > 0 ? `${veiculo.mileage.toLocaleString('pt-BR')} km rodados` : ''
}

/**
 * Descrição em texto corrido: nome com versão, ano/modelo, km, câmbio,
 * combustível, cor e opcionais. Montada dos campos, e não a `description` do
 * AutoConf, porque aquela não traz cor nem opcionais e promete "documentação
 * em dia" sem que o dado diga isso.
 */
function descricao(veiculo: Vehicle, nome: string): string {
  const abertura = [nome, anoModelo(veiculo) && `ano/modelo ${anoModelo(veiculo)}`, quilometragem(veiculo)]
    .filter(Boolean)
    .join(', ')

  const ficha = [
    texto(veiculo.transmission) && `câmbio ${texto(veiculo.transmission)}`,
    texto(veiculo.fuel_type) && `combustível ${texto(veiculo.fuel_type)}`,
    texto(veiculo.color) && `cor ${texto(veiculo.color)}`,
  ]
    .filter(Boolean)
    .join(', ')

  const opcionais = (veiculo.options ?? []).map(texto).filter(Boolean)

  return [
    `${abertura}.`,
    ficha && `${ficha.charAt(0).toUpperCase()}${ficha.slice(1)}.`,
    opcionais.length > 0 && `Opcionais: ${opcionais.join(', ')}.`,
  ]
    .filter(Boolean)
    .join(' ')
}

export interface ProblemaWhatsApp {
  id: string
  campo: ColunaWhatsApp
  motivo: string
}

export interface FeedMetaWhatsAppGerado {
  csv: string
  linhas: number
  recusados: ProblemaWhatsApp[]
}

type LinhaOuProblema =
  | { ok: true; valores: Record<ColunaWhatsApp, string> }
  | { ok: false; problema: ProblemaWhatsApp }

function linhaDoVeiculo(veiculo: Vehicle): LinhaOuProblema {
  const id = texto(veiculo.id)
  const recusa = (campo: ColunaWhatsApp, motivo: string): LinhaOuProblema =>
    ({ ok: false, problema: { id: id || '(sem id)', campo, motivo } })

  // Mesma regra do `isPubliclyListed` do estoque. A rota já entrega só o que
  // está à venda; a checagem aqui mantém a regra mesmo se alguém passar o
  // estoque inteiro, porque carro vendido no WhatsApp vira conversa perdida.
  if (veiculo.status !== 'available' && veiculo.status !== 'highlight') {
    return recusa('availability', `fora de venda: ${veiculo.status}`)
  }

  const marca = texto(veiculo.brand)
  const modelo = texto(veiculo.model)
  const versao = versaoSemRepetirModelo(modelo, texto(expandirAbreviacoes(veiculo.version)))
  const nome = [marca, modelo, versao].filter(Boolean).join(' ')
  const fotos = (veiculo.photos ?? []).filter(f => f?.startsWith('https://'))

  // O Meta rejeita o item sem obrigatório, e o Commerce Manager mostra só
  // "itens com erro". Sai daqui antes, com o carro e o motivo no log.
  if (!id) return recusa('id', 'obrigatório vazio')
  if (!marca) return recusa('brand', 'obrigatório vazio')
  if (!(veiculo.price > 0)) return recusa('price', `preço inválido: ${veiculo.price}`)
  if (!fotos[0]) return recusa('image_link', 'sem foto https')
  if (!veiculo.slug) return recusa('link', 'sem slug — a URL não resolveria')

  return {
    ok: true,
    valores: {
      id,
      title: limitar([nome, veiculo.year_model > 0 ? veiculo.year_model : ''].filter(Boolean).join(' '), MAX_TITULO),
      description: limitar(descricao(veiculo, nome), MAX_DESCRICAO),
      // Só chega aqui carro à venda; o que sai de venda some do arquivo.
      availability: 'in stock',
      condition: veiculo.is_new ? 'new' : 'used',
      price: `${veiculo.price.toFixed(2)} BRL`,
      link: `${SITE_URL}/veiculo/${veiculo.slug}`,
      image_link: fotos[0],
      additional_image_link: fotos.slice(1, 1 + MAX_IMAGENS_ADICIONAIS).join(','),
      brand: marca,
    },
  }
}

export function gerarFeedMetaWhatsApp(veiculos: Vehicle[]): FeedMetaWhatsAppGerado {
  const recusados: ProblemaWhatsApp[] = []
  const linhas: string[] = [COLUNAS_WHATSAPP.join(',')]

  for (const veiculo of veiculos) {
    const resultado = linhaDoVeiculo(veiculo)
    if (!resultado.ok) {
      recusados.push(resultado.problema)
      continue
    }
    linhas.push(COLUNAS_WHATSAPP.map(c => celula(resultado.valores[c])).join(','))
  }

  return { csv: linhas.join('\n') + '\n', linhas: linhas.length - 1, recusados }
}
