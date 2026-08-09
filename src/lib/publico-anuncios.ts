/**
 * Preparação de lista de público para o Ads Manager do OpenAI.
 *
 * A parte que erra num upload de público não é o envio — é a normalização. Um
 * telefone gravado como "(34) 99944-4747" e o mesmo telefone gravado como
 * "5534999444747" são a MESMA pessoa e viram duas linhas que não
 * correspondem a ninguém. Como a plataforma só diz quantos bateram, e não
 * quais, um erro de formato aparece como "público pequeno" e não como erro.
 *
 * Regras da plataforma que este módulo respeita:
 *   - um único tipo de identificador por arquivo, sem misturar;
 *   - CSV com cabeçalho exatamente `email`, `phone_number`, `email_sha256` ou
 *     `phone_number_sha256`, ou TXT com um por linha;
 *   - UTF-8.
 */

import { createHash } from 'crypto'

export type TipoIdentificador =
  | 'email'
  | 'phone_number'
  | 'email_sha256'
  | 'phone_number_sha256'

/**
 * Normaliza e-mail: sem espaço, tudo minúsculo.
 *
 * Não mexe em ponto nem em sufixo `+tag` do Gmail de propósito. Seria uma
 * "correção" nossa sobre o endereço que a pessoa cadastrou, e se a plataforma
 * não fizer o mesmo, o que era um endereço válido vira um que não bate.
 */
export function normalizarEmail(bruto: string | null | undefined): string | null {
  const valor = (bruto ?? '').trim().toLowerCase()
  if (!valor) return null
  // Validação deliberadamente simples: aqui só se descarta lixo evidente
  // (célula vazia, "não informado", nome no lugar do e-mail).
  if (!/^[^@\s,;]+@[^@\s,;]+\.[a-z]{2,}$/.test(valor)) return null
  return valor
}

/**
 * Normaliza telefone brasileiro para E.164 (`+55DDNNNNNNNNN`).
 *
 * Trata os quatro jeitos que um telefone chega numa planilha: com máscara, com
 * o 55 na frente, com o zero da operadora, e sem o nono dígito — celular
 * cadastrado antes de 2016 tem 8 dígitos e precisa do 9 na frente, senão não
 * corresponde a ninguém. Numa base de 5 anos isso é a maioria dos registros
 * antigos.
 *
 * Fixo é descartado: público de anúncio casa com conta de usuário, e conta não
 * se cria com telefone fixo. Manter fixo só infla a lista e derruba a taxa de
 * correspondência.
 */
export function normalizarTelefone(bruto: string | null | undefined): string | null {
  let digitos = (bruto ?? '').replace(/\D/g, '')
  if (!digitos) return null

  // Planilha costuma exportar número como "5534999444747.0"; o replace acima já
  // tirou o ponto, então um zero final pode ser do próprio número. Não dá para
  // desfazer com segurança — quem exporta deve exportar como texto.

  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    digitos = digitos.slice(2)
  }
  // Zero de operadora: "034 99944..."
  if (digitos.length === 11 && digitos.startsWith('0')) digitos = digitos.slice(1)
  if (digitos.length === 12 && digitos.startsWith('0')) digitos = digitos.slice(1)

  if (digitos.length !== 10 && digitos.length !== 11) return null

  const ddd = digitos.slice(0, 2)
  let numero = digitos.slice(2)

  // DDD brasileiro válido vai de 11 a 99, e nenhum começa com 0.
  if (ddd[0] === '0') return null

  // Nono dígito para cadastro antigo de 8 dígitos.
  if (numero.length === 8) {
    // Fixo antigo começa em 2–5; celular antigo em 6–9. Só o celular ganha o 9.
    if (!/^[6-9]/.test(numero)) return null
    numero = '9' + numero
  }

  if (numero.length !== 9 || numero[0] !== '9') return null

  return `+55${ddd}${numero}`
}

/** SHA-256 em hexadecimal minúsculo, sobre o valor JÁ normalizado. */
export function hash(valor: string): string {
  return createHash('sha256').update(valor, 'utf8').digest('hex')
}

export interface ResultadoPreparo {
  /** Identificadores prontos, únicos, na ordem em que apareceram. */
  identificadores: string[]
  /** Conteúdo do arquivo a enviar. */
  csv: string
  totalLido: number
  descartados: number
  duplicados: number
}

/**
 * Transforma uma coluna crua na lista pronta para upload.
 *
 * Devolve também o que foi descartado e o que era duplicado. Sem esses dois
 * números, uma coluna trocada por engano produz um arquivo pequeno e válido, e
 * ninguém descobre até o público não ativar.
 */
export function prepararPublico(
  valores: Array<string | null | undefined>,
  tipo: TipoIdentificador,
): ResultadoPreparo {
  const ehEmail = tipo === 'email' || tipo === 'email_sha256'
  const ehHash = tipo.endsWith('_sha256')

  const vistos = new Set<string>()
  const identificadores: string[] = []
  let descartados = 0
  let duplicados = 0

  for (const bruto of valores) {
    const normalizado = ehEmail ? normalizarEmail(bruto) : normalizarTelefone(bruto)
    if (!normalizado) {
      descartados++
      continue
    }
    // Deduplica pelo valor NORMALIZADO, antes do hash: dois formatos do mesmo
    // telefone só são reconhecidos como iguais depois de normalizados.
    if (vistos.has(normalizado)) {
      duplicados++
      continue
    }
    vistos.add(normalizado)
    identificadores.push(ehHash ? hash(normalizado) : normalizado)
  }

  return {
    identificadores,
    csv: [tipo, ...identificadores].join('\n') + '\n',
    totalLido: valores.length,
    descartados,
    duplicados,
  }
}

/** Mínimo de usuários CORRESPONDIDOS para o público ficar utilizável. */
export const MINIMO_CORRESPONDIDOS = 25_000
