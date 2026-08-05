/**
 * Normaliza o nome do estado que vem da geolocalização por IP para a sigla (UF).
 *
 * O serviço devolve valores inconsistentes: a maioria em português
 * ("Minas Gerais", "São Paulo"), alguns em INGLÊS ("Federal District") e outros
 * sem acento ("Goias", "Ceara", "Sao Paulo" convivendo com as versões corretas).
 * Como esse texto entrava cru na mensagem do WhatsApp, o cliente de Brasília
 * recebia "sou de Brasília/Federal District" — mistura de idioma numa mensagem
 * que ele mesmo envia para a loja.
 *
 * A sigla resolve os três casos de uma vez e é como o brasileiro escreve:
 * "Brasília/DF".
 */

/** Chave normalizada (sem acento, minúscula) → sigla. */
const POR_NOME: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  // Como o serviço de geolocalização devolve Brasília.
  'federal district': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
}

/** Siglas válidas, para aceitar quando o serviço já manda "MG". */
const SIGLAS = new Set(Object.values(POR_NOME))

function chave(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Devolve a sigla do estado, ou o texto original quando não reconhece.
 *
 * O retorno do original é proposital: região estrangeira ou nome novo continua
 * aparecendo, em vez de sumir da mensagem. Perder a informação seria pior que
 * mostrá-la sem sigla.
 */
export function siglaDoEstado(regiao: string | null | undefined): string {
  if (!regiao) return ''
  const bruto = regiao.trim()
  if (!bruto) return ''
  const k = chave(bruto)
  if (SIGLAS.has(bruto.toUpperCase()) && bruto.length === 2) return bruto.toUpperCase()
  return POR_NOME[k] ?? bruto
}
