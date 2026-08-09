/**
 * Parâmetros que o Google Ads envia em código de uma letra.
 *
 * `matchtype=e`, `device=m` e `network=g` são ilegíveis num painel: ninguém
 * decide verba olhando para "e". A tradução mora aqui, e o valor CRU é o que
 * fica gravado — traduzir na escrita perderia qualquer valor que a plataforma
 * passe a mandar e que ainda não conheçamos.
 *
 * Pelo mesmo motivo, o que não está no mapa aparece como veio, e não como
 * "desconhecido": um código novo tem que ficar visível para alguém investigar,
 * não sumir num balde genérico.
 */

const MATCHTYPE: Record<string, string> = {
  e: 'Exata',
  p: 'Frase',
  b: 'Ampla',
}

const DEVICE: Record<string, string> = {
  m: 'Celular',
  c: 'Computador',
  t: 'Tablet',
}

const NETWORK: Record<string, string> = {
  g: 'Pesquisa do Google',
  s: 'Parceiros de pesquisa',
  d: 'Rede de Display',
  u: 'Campanha inteligente',
  ytv: 'YouTube',
  vp: 'Parceiros de vídeo',
}

/**
 * Normaliza o valor cru antes de gravar: sem espaço, minúsculo e com teto de
 * tamanho.
 *
 * O teto é proteção contra URL adulterada — estes parâmetros entram por
 * querystring, que qualquer pessoa edita, e uma coluna de texto sem limite
 * vira vetor de lixo no banco. Nenhum código legítimo passa de 16 caracteres.
 */
export function normalizarParametroAnuncio(bruto: string | null | undefined): string | null {
  const valor = (bruto ?? '').trim().toLowerCase()
  if (!valor) return null
  // Placeholder não substituído: o Google manda "{keyword}" literal quando o
  // modelo de rastreamento está errado. Gravar isso encheria o painel de uma
  // linha "{device}" que não é dado nenhum — é defeito de configuração.
  if (valor.startsWith('{') || valor.endsWith('}')) return null
  if (!/^[a-z0-9_-]{1,16}$/.test(valor)) return null
  return valor
}

function traduzir(mapa: Record<string, string>, valor: string | null | undefined): string {
  const chave = (valor ?? '').trim().toLowerCase()
  if (!chave) return '(não informado)'
  return mapa[chave] ?? chave
}

export const rotuloMatchType = (v: string | null | undefined) => traduzir(MATCHTYPE, v)
export const rotuloDevice = (v: string | null | undefined) => traduzir(DEVICE, v)
export const rotuloNetwork = (v: string | null | undefined) => traduzir(NETWORK, v)
