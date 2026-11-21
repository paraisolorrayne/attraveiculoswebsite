/**
 * Vehicle Description Generator
 * Generates consistent, deterministic descriptions based on structured vehicle data
 * No external API dependencies - pure data-driven approach
 *
 * Desde 22/10/2026, o anúncio com a ficha do molde da AutoConf tem texto
 * próprio, montado com os campos dela (`descricaoPelaFicha`). Sem ficha, os
 * modelos por categoria abaixo continuam como eram.
 */

import type { Vehicle } from '@/types'
import type { FichaDoAnuncio } from '@/lib/ficha-do-anuncio'
import { expandirAbreviacoes } from '@/lib/normalizar-abreviacoes'
import { motorizacao } from '@/lib/taxonomia-veiculo'

/**
 * Format mileage for display
 */
function formatMileage(km: number): string {
  if (km === 0) return '0 km'
  return `${km.toLocaleString('pt-BR')} km`
}

/**
 * Get version string without duplicating model name and clean technical specs
 * This function processes the version that has already been cleaned at mapping time,
 * but also handles any remaining technical patterns for display
 */
function getCleanVersion(model: string, version: string | null): string {
  if (!version) return ''

  let cleaned = version

  // Remove the model name from version if it starts with it (redundant safety)
  const modelLower = model.toLowerCase()
  const versionLower = cleaned.toLowerCase()

  if (versionLower.startsWith(modelLower)) {
    cleaned = cleaned.substring(model.length).trim()
  }

  // Remove technical specs that might remain for cleaner display
  // Engine displacement: "3.6/3.8", "2.0", etc.
  cleaned = cleaned.replace(/\s*\d+\.\d+(?:\/\d+\.\d+)?\s*/g, ' ')
  // Valve config: "24V", "16V"
  cleaned = cleaned.replace(/\s*\d+V\s*/gi, ' ')
  // Generation codes in parentheses: "(991/992)", "(G20)"
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, ' ')
  // Clean multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  // Abreviação do AutoConf por extenso — "BI-TB" vira "Bi-Turbo", "Aut." vira
  // "Automático". Fica por ÚLTIMO de propósito: as limpezas acima removem
  // cilindrada e código de geração, e expandir antes disso faria a expansão
  // ser recortada pelas regex seguintes.
  cleaned = expandirAbreviacoes(cleaned)

  return cleaned
}

/**
 * Extract engine info from version string
 */
function extractEngineInfo(version: string | null): string | null {
  if (!version) return null
  
  // Look for patterns like "2.0", "3.0 TB", "V8", "V12", etc.
  const engineMatch = version.match(/(\d+\.\d+)\s*(TB|Turbo|TSI|TFSI|BiTurbo)?/i)
  if (engineMatch) {
    const displacement = engineMatch[1]
    const turbo = engineMatch[2] ? ' turbo' : ''
    return `${displacement}${turbo}`
  }
  
  const vEngineMatch = version.match(/(V\d+)/i)
  if (vEngineMatch) {
    return vEngineMatch[1]
  }
  
  return null
}

/**
 * Itens do cadastro que diferenciam o carro e por isso entram no texto (no
 * máximo 4). Item de série da lista padrão da AutoConf (airbag, freios ABS,
 * travas, vidros, ar-condicionado, direção) fica de fora: num carro de luxo,
 * listar isso rebaixa o anúncio em vez de descrevê-lo (auditoria de 20/11/2026).
 */
const ITENS_QUE_DIFERENCIAM = [
  'blindad', 'teto solar', 'teto panorâmico', 'head-up', 'bancos elétricos',
  'bancos em couro', 'bancos esportivos', 'som premium', 'fibra de carbono', 'carbono-cerâmica',
]

function itensQueDiferenciam(options: string[] | null): string[] {
  if (!options || options.length === 0) return []
  return options
    .filter(o => ITENS_QUE_DIFERENCIAM.some(item => o.toLowerCase().includes(item)))
    .slice(0, 4)
}

/**
 * O "Sobre este veículo". Com a ficha do molde, vem dela (`descricaoPelaFicha`);
 * sem ela, só com os campos do cadastro (`descricaoPeloCadastro`). Nos dois
 * casos, só fatos: sem adjetivo por marca, sem estado de conservação que
 * ninguém afirmou e sem câmbio presumido quando o campo vem vazio.
 */
export function generateVehicleDescription(vehicle: Vehicle): string {
  const cleanVersion = getCleanVersion(vehicle.model, vehicle.version)
  const yearDisplay = vehicle.year_manufacture === vehicle.year_model
    ? String(vehicle.year_model)
    : `${vehicle.year_manufacture}/${vehicle.year_model}`
  const abertura = `Este ${vehicle.brand} ${vehicle.model}${cleanVersion ? ` ${cleanVersion}` : ''} ${yearDisplay}`

  if (vehicle.ficha) return descricaoPelaFicha(vehicle, vehicle.ficha, abertura)
  return descricaoPeloCadastro(vehicle, abertura)
}

/** "Este Ferrari 296 GTB 2024 tem câmbio automático. Com apenas 2.610 km rodados, vem na cor vermelho, com motorização híbrida." */
function descricaoPeloCadastro(vehicle: Vehicle, abertura: string): string {
  const frases: string[] = []

  const engineInfo = extractEngineInfo(vehicle.version)
  const motor = vehicle.horsepower
    ? `motor${engineInfo ? ` ${engineInfo}` : ''} de ${vehicle.horsepower} cv`
    : engineInfo ? `motor ${engineInfo}` : ''
  const cambio = vehicle.transmission ? `câmbio ${vehicle.transmission.toLowerCase()}` : ''
  const mecanica = juntarComE([motor, cambio])
  frases.push(mecanica ? `${abertura} tem ${mecanica}.` : `${abertura} faz parte do estoque da Attra Veículos.`)

  const zeroKm = vehicle.is_new || vehicle.mileage === 0
  const km = formatMileage(vehicle.mileage)
  const quilometragem = zeroKm
    ? 'Zero quilômetro'
    : vehicle.mileage < 50000 ? `Com apenas ${km} rodados` : `Com ${km} rodados`
  const cor = vehicle.color ? `vem na cor ${vehicle.color.toLowerCase()}` : ''
  const combustivel = vehicle.fuel_type ? `com motorização ${motorizacao(vehicle.fuel_type)}` : ''
  const exemplar = [cor, combustivel].filter(Boolean).join(', ')
  frases.push(exemplar ? `${quilometragem}, ${exemplar}.` : zeroKm ? 'É zero quilômetro.' : `Tem ${km} rodados.`)

  const itens = itensQueDiferenciam(vehicle.options)
  if (itens.length > 0) frases.push(`Traz ${juntarComE(itens.map(emMinuscula))}.`)

  return frases.join(' ')
}

// --- texto pela ficha do molde ------------------------------------------------

// Começo que não vai para minúscula: nome próprio de marca, material ou pacote.
const NOME_PROPRIO = /^(Alcantara|Akrapovi[cč]|Bang|Bose|Bowers|Brembo|Burmester|Harman|Mark|Meridian|Michelin|Naim|Nappa|Pirelli|Recaro|Sport)\b/

/**
 * "Blindado BSS" vira "blindado BSS" no meio da frase. Sigla, número e nome
 * próprio da lista ficam como o marketing escreveu.
 */
export function emMinuscula(texto: string): string {
  if (NOME_PROPRIO.test(texto)) return texto
  return /^[A-ZÀ-Ý][a-zà-ÿ]+(?=[\s,;.]|$)/.test(texto) ? texto[0].toLowerCase() + texto.slice(1) : texto
}

/** "câmbio" + "PDK de 8 marchas"; sem repetir quando o valor já começa pelo rótulo. */
export function comRotulo(rotulo: string, valor: string, minuscula = true): string {
  const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (semAcento(valor).startsWith(`${semAcento(rotulo)} `)) return `${rotulo}${valor.slice(rotulo.length)}`
  return `${rotulo} ${minuscula ? emMinuscula(valor) : valor}`
}

/** "a", "a e b", "a, b e c". */
export function juntarComE(itens: string[]): string {
  const lista = itens.filter(Boolean)
  if (lista.length <= 1) return lista.join('')
  return `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}`
}

const MAX_ITENS_DA_LISTA = 4

/**
 * O "Sobre este veículo" de um anúncio com a ficha do molde da AutoConf
 * (`ficha-do-anuncio.ts`): motor, potência e torque; câmbio, tração e freios;
 * desempenho; cor, interior, som e rodas; os diferenciais e os opcionais que o
 * marketing escreveu. Campo da ficha vence o do cadastro, como na tabela da
 * ficha técnica.
 *
 * Só fatos. Sem "excelente estado" nem "bem cuidado": a ficha não diz nada
 * sobre conservação, e o texto não promete o que o anúncio não afirma.
 */
function descricaoPelaFicha(vehicle: Vehicle, ficha: FichaDoAnuncio, abertura: string): string {
  const frases: string[] = []

  const motor = motorPelaFicha(vehicle, ficha)
  const conjunto = conjuntoPelaFicha(vehicle, ficha)

  if (motor && conjunto) frases.push(`${abertura} tem ${motor}, com ${conjunto}.`)
  else if (motor || conjunto) frases.push(`${abertura} tem ${motor || conjunto}.`)
  else frases.push(`${abertura} faz parte do estoque da Attra Veículos.`)

  const desempenho = desempenhoPelaFicha(ficha)
  if (desempenho) frases.push(desempenho)

  const zeroKm = vehicle.is_new || vehicle.mileage === 0
  const km = formatMileage(vehicle.mileage)
  const quilometragem = zeroKm
    ? 'Zero quilômetro'
    : vehicle.mileage < 50000 ? `Com apenas ${km} rodados` : `Com ${km} rodados`
  const cor = corPelaFicha(vehicle, ficha)
  const exemplar = juntarComE([
    ficha.interior ? comRotulo('interior', ficha.interior) : '',
    ficha.som ? comRotulo('som', ficha.som, false) : '',
    ficha.rodas ? comRotulo('rodas', ficha.rodas) : '',
  ])
  if (cor) frases.push(`${quilometragem}, vem na cor ${cor}${exemplar ? `, com ${exemplar}` : ''}.`)
  else if (exemplar) frases.push(`${quilometragem}, vem com ${exemplar}.`)
  else frases.push(zeroKm ? 'É zero quilômetro.' : `Tem ${km} rodados.`)

  if (ficha.diferenciais.length > 0) {
    const itens = ficha.diferenciais.slice(0, MAX_ITENS_DA_LISTA).map(emMinuscula)
    frases.push(`Diferenciais deste exemplar: ${juntarComE(itens)}.`)
  }
  if (ficha.opcionais.length > 0) {
    const itens = ficha.opcionais.slice(0, MAX_ITENS_DA_LISTA).map(emMinuscula)
    frases.push(`Traz ainda ${juntarComE(itens)}.`)
  }

  return frases.join(' ')
}

// Partes que o "Sobre este veículo" e as seções de baixo da ficha dividem.

/** "motor 4.0 V8 Biturbo Híbrido de 802 cv e 145,8 kgfm de torque". */
function motorPelaFicha(vehicle: Vehicle, ficha: FichaDoAnuncio): string {
  const potencia = ficha.potencia ?? (vehicle.horsepower ? `${vehicle.horsepower} cv` : null)
  let motor = ficha.motor ? comRotulo('motor', ficha.motor, false) : ''
  if (potencia) motor = motor ? `${motor} de ${potencia}` : `motor de ${potencia}`
  if (ficha.torque) motor = motor ? `${motor} e ${ficha.torque} de torque` : `${ficha.torque} de torque`
  return motor
}

/** "câmbio PDK de 8 marchas, tração integral e freios de carbono-cerâmica". */
function conjuntoPelaFicha(vehicle: Vehicle, ficha: FichaDoAnuncio): string {
  const cambio = ficha.cambio ?? vehicle.transmission
  return juntarComE([
    cambio ? comRotulo('câmbio', cambio) : '',
    ficha.tracao ? comRotulo('tração', ficha.tracao) : '',
    ficha.freios ? comRotulo('freios', ficha.freios) : '',
  ])
}

function desempenhoPelaFicha(ficha: FichaDoAnuncio): string | null {
  const { aceleracao_0_100: zeroACem, velocidade_maxima: velocidade } = ficha
  if (zeroACem && velocidade) return `Acelera de 0 a 100 km/h em ${zeroACem} e chega a ${velocidade}.`
  if (zeroACem) return `Acelera de 0 a 100 km/h em ${zeroACem}.`
  if (velocidade) return `Chega a ${velocidade} de velocidade máxima.`
  return null
}

// A cor do molde é nome de pintura ("Prata High-Tech Metálico") e fica como
// foi escrita; a do cadastro vai em minúscula, como nos outros textos.
function corPelaFicha(vehicle: Vehicle, ficha: FichaDoAnuncio): string | undefined {
  return ficha.cor ?? vehicle.color?.toLowerCase()
}

// --- seções de baixo da ficha (Overview / Exterior Design / Interior) --------

const maiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

// Item das listas do molde que é claramente de fora ou de dentro do carro. O
// que não casa com nenhum dos dois, ou casa com os dois ("Acabamentos em fibra
// de carbono"), fica só no "Sobre este veículo" e na ficha técnica.
const DE_FORA = /\b(rodas?|pneus?|pintura|vidros?|blind|far[oó]is|farol|lanternas?|carroceria|para-?choques?|grade|aerof[oó]lio|spoiler|difusor|saias?|retrovisor(es)?|teto solar|teto panor|ppf|envelopa|pin[cç]as?|exterior)/i
const DE_DENTRO = /\b(bancos?|encostos?|travesseiros?|couro|alcantara|nappa|volante|painel|console|forra[cç][aã]o|carpetes?|tapetes?|massage|climatiza|ar[- ]condicionado|multim[ií]dia|telas?\b|head[- ]?up|som\b|alto-falantes?|ilumina[cç][aã]o ambiente|cabine|interior|cintos?)/i
const MAX_ITENS_POR_SECAO = 3

function itensDoLado(ficha: FichaDoAnuncio, lado: RegExp, outro: RegExp): string[] {
  return [...ficha.diferenciais, ...ficha.opcionais]
    .filter(item => lado.test(item) && !outro.test(item))
    .slice(0, MAX_ITENS_POR_SECAO)
}

/** "Blindado BSS com vidros Graphene Full Steel e rodas aro 21." */
function fraseDosItens(itens: string[]): string | null {
  if (itens.length === 0) return null
  const [primeiro, ...resto] = itens.map(i => i.replace(/[.;]+$/, ''))
  return `${maiuscula(juntarComE([primeiro, ...resto.map(emMinuscula)]))}.`
}

export interface TextosDasSecoes {
  overview: string
  /** null: a ficha não tem nada desta seção e fica o texto fixo do componente. */
  exterior: string | null
  interior: string | null
}

/**
 * Os textos de Overview, Exterior Design e Interior quando o anúncio tem a
 * ficha do molde (desde 28/10/2026). Antes vinham só do cadastro (o texto do
 * Gemini ou o fixo do componente) e brigavam com a ficha logo acima: "Cor
 * prata" contra "Prata High-Tech Metálico" no S 63, e os 802 cv no Exterior.
 * Cada seção fica com a sua parte da ficha, sem IA:
 * - Overview: versão, ano e km; motor, potência, torque, câmbio, tração,
 *   freios e desempenho.
 * - Exterior: pintura e rodas, e os itens das listas que são de fora do carro
 *   (blindagem, vidros, faróis…).
 * - Interior: interior e som, e os itens que são de dentro (bancos, encostos…).
 * Campo da ficha vence o do cadastro, como no "Sobre este veículo".
 */
export function secoesPelaFicha(vehicle: Vehicle, ficha: FichaDoAnuncio): TextosDasSecoes {
  const versao = getCleanVersion(vehicle.model, vehicle.version)
  const ano = vehicle.year_manufacture === vehicle.year_model
    ? String(vehicle.year_model)
    : `${vehicle.year_manufacture}/${vehicle.year_model}`
  const km = vehicle.is_new || vehicle.mileage === 0 ? 'zero quilômetro' : `com ${formatMileage(vehicle.mileage)} rodados`
  const motor = motorPelaFicha(vehicle, ficha)
  const conjunto = conjuntoPelaFicha(vehicle, ficha)
  const overview = [
    `${vehicle.brand} ${vehicle.model}${versao ? ` ${versao}` : ''} ${ano}, ${km}.`,
    motor || conjunto ? `${maiuscula(motor && conjunto ? `${motor}, com ${conjunto}` : motor || conjunto)}.` : null,
    desempenhoPelaFicha(ficha),
  ]

  // A carroceria já é o título da seção; no texto ela só entra se não houver
  // mais nada. "Sedã" vira "sedã" e "SUV" fica "SUV" (emMinuscula só mexe em
  // palavra capitalizada).
  const cor = corPelaFicha(vehicle, ficha)
  let fora = cor ? `Pintura ${cor}` : ''
  if (ficha.rodas) fora = fora ? `${fora}, com ${comRotulo('rodas', ficha.rodas)}` : maiuscula(comRotulo('rodas', ficha.rodas))
  const exterior = [fora ? `${fora}.` : null, fraseDosItens(itensDoLado(ficha, DE_FORA, DE_DENTRO))]
  if (!exterior.some(Boolean) && vehicle.body_type) exterior.push(`Carroceria ${emMinuscula(vehicle.body_type)}.`)

  const dentro = juntarComE([
    ficha.interior ? comRotulo('interior', ficha.interior) : '',
    ficha.som ? comRotulo('som', ficha.som, false) : '',
  ])
  const interior = [dentro ? `${maiuscula(dentro)}.` : null, fraseDosItens(itensDoLado(ficha, DE_DENTRO, DE_FORA))]

  const texto = (frases: Array<string | null>) => frases.filter(Boolean).join(' ') || null
  return { overview: texto(overview) ?? '', exterior: texto(exterior), interior: texto(interior) }
}

/**
 * Result interface for compatibility
 */
export interface DescriptionResult {
  description: string
  source: 'generated'
}

