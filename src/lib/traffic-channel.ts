/**
 * Classificação de CANAL DE TRÁFEGO das sessões de visitantes.
 *
 * A classificação é feita em TEMPO DE LEITURA, a partir das colunas que já existem em
 * `visitor_sessions` (utm_*, gclid/fbclid/ttclid, referrer_domain). Isso é deliberado: sem
 * coluna nova, sem migration e sem backfill, todas as sessões históricas passam a ter canal
 * imediatamente — inclusive as que foram gravadas antes desta biblioteca existir.
 *
 * Arquivo puro: sem I/O, sem banco, sem React. Precisa rodar em rota de API (Node) e no client.
 */

export type CanalTrafego =
  | 'busca_paga'
  | 'social_pago'
  | 'outra_midia_paga'
  | 'busca_organica'
  | 'social_organico'
  | 'assistente_ia'
  | 'direto'
  | 'referencia'
  | 'outro'

/**
 * Aceita a linha de `visitor_sessions` direta (campos `string | null`) ou um objeto parcial.
 * `utm_campaign` entra aqui só por ergonomia — quem já tem a sessão passa o objeto inteiro —,
 * mas NÃO influencia o canal: nome de campanha é texto livre do anunciante e usá-lo como
 * sinal geraria classificação instável. Para agrupar campanha use `normalizarCampanha`.
 */
export interface SessaoAtribuicao {
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  gclid?: string | null
  fbclid?: string | null
  ttclid?: string | null
  referrer_domain?: string | null
}

export const SEM_CAMPANHA = '(sem campanha)'
export const SEM_FONTE = '(sem fonte)'

/** Domínio próprio: tráfego interno, não é referência. */
const DOMINIO_PROPRIO = 'attraveiculos.com.br'

/**
 * Valores que os coletores gravam quando "não há valor". Tratados como vazio para que o
 * click id volte a decidir (ex.: `utm_medium=(not set)` + gclid ainda é busca paga).
 *
 * Exportado como LISTA de propósito: quem agrega no banco (a rota /api/admin/visitors/metrics)
 * precisa aplicar EXATAMENTE este saneamento no SQL. Enquanto a lista for a mesma, a rota e
 * esta biblioteca não podem discordar sobre o que é "vazio" — e a mesma sessão não aparece
 * classificada de dois jeitos em duas tabelas da mesma tela.
 */
export const VALORES_NULOS_LISTA: readonly string[] = [
  '(not set)', 'not set', 'none', '(none)', 'null', 'undefined', '(direct)', 'direct', '-',
]

const VALORES_NULOS = new Set(VALORES_NULOS_LISTA)

type GrupoPlataforma = 'busca' | 'social' | 'ia'

interface Plataforma {
  /** Nome canônico usado por `normalizarFonte` para unificar apelidos ("ig" e "instagram"). */
  canonica: string
  grupo: GrupoPlataforma
  /** Comparação por igualdade — obrigatório para apelidos curtos: "ig" como substring casaria com "digital". */
  exatos?: string[]
  /**
   * Rótulo DNS: casa quando o host tem esse rótulo inteiro entre pontos. "instagram" pega
   * `l.instagram.com`; "google" pega `www.google.com.br` (que um sufixo `google.com` não pegaria).
   * NUNCA é substring: "fb" não vira rótulo, senão `algumfb.com.br` casaria.
   */
  rotulos?: string[]
  /**
   * Domínio inteiro: casa por igualdade ou como sufixo `.dominio`. É a forma certa para
   * domínios cujo primeiro rótulo é curto demais para valer sozinho — "x.com" (Twitter) e
   * "t.co", "t.me", "fb.com", "wa.me", "youtu.be".
   */
  dominios?: string[]
}

/**
 * A ORDEM importa: a primeira plataforma que casar vence. Os assistentes de IA vêm primeiro
 * porque vários moram sob domínios de busca (gemini.google.com, copilot.microsoft.com) e
 * seriam engolidos pela regra do Google/Bing.
 */
const PLATAFORMAS: Plataforma[] = [
  // Assistentes de IA — canal novo e, na base real, o de maior taxa de conversão.
  { canonica: 'chatgpt', grupo: 'ia', exatos: ['chatgpt', 'openai'], rotulos: ['chatgpt', 'openai'] },
  { canonica: 'perplexity', grupo: 'ia', exatos: ['perplexity'], rotulos: ['perplexity'] },
  { canonica: 'copilot', grupo: 'ia', exatos: ['copilot'], rotulos: ['copilot'] },
  { canonica: 'gemini', grupo: 'ia', exatos: ['gemini', 'bard'], rotulos: ['gemini', 'bard'] },
  { canonica: 'claude', grupo: 'ia', exatos: ['claude'], dominios: ['claude.ai'] },

  // Busca
  {
    canonica: 'google',
    grupo: 'busca',
    exatos: ['google', 'adwords', 'googleads', 'google-ads', 'google_ads'],
    // doubleclick/googleadservices são redirecionadores de anúncio do próprio Google.
    rotulos: ['google', 'doubleclick', 'googleadservices', 'googlesyndication'],
  },
  // "microsoft" fica só em `exatos`: como rótulo transformaria qualquer subdomínio da Microsoft
  // em busca orgânica.
  { canonica: 'bing', grupo: 'busca', exatos: ['bing', 'msn', 'microsoft'], rotulos: ['bing', 'msn'] },
  { canonica: 'duckduckgo', grupo: 'busca', exatos: ['duckduckgo', 'ddg'], rotulos: ['duckduckgo'] },
  { canonica: 'yahoo', grupo: 'busca', exatos: ['yahoo'], rotulos: ['yahoo'] },
  { canonica: 'yandex', grupo: 'busca', exatos: ['yandex'], rotulos: ['yandex'] },
  { canonica: 'ecosia', grupo: 'busca', exatos: ['ecosia'], rotulos: ['ecosia'] },
  { canonica: 'brave', grupo: 'busca', exatos: ['brave'], rotulos: ['brave'] },

  // Social — Meta primeiro porque concentra o grosso da verba desta operação.
  {
    canonica: 'meta',
    grupo: 'social',
    // "ig", "fb" e "meta" só por igualdade: como substring pegariam "digital", "fbi", "metaverso".
    exatos: ['ig', 'fb', 'meta', 'insta', 'facebook', 'instagram', 'meta-ads', 'metaads', 'meta_ads'],
    rotulos: ['facebook', 'instagram', 'messenger'],
    dominios: ['fb.com', 'fb.me'],
  },
  { canonica: 'tiktok', grupo: 'social', exatos: ['tiktok', 'tt', 'tik-tok'], rotulos: ['tiktok'] },
  { canonica: 'youtube', grupo: 'social', exatos: ['youtube', 'yt'], rotulos: ['youtube'], dominios: ['youtu.be'] },
  { canonica: 'linkedin', grupo: 'social', exatos: ['linkedin'], rotulos: ['linkedin'], dominios: ['lnkd.in'] },
  // "x.com" e "t.co" só como domínio inteiro: como substring, 'olx.com.br' contém "x.com" e a
  // OLX — um dos maiores referrers de uma concessionária — virava "social orgânico".
  {
    canonica: 'twitter',
    grupo: 'social',
    exatos: ['twitter', 'x', 't.co'],
    rotulos: ['twitter'],
    dominios: ['x.com', 't.co'],
  },
  { canonica: 'pinterest', grupo: 'social', exatos: ['pinterest'], rotulos: ['pinterest'] },
  { canonica: 'kwai', grupo: 'social', exatos: ['kwai'], rotulos: ['kwai'] },
  // Mensageiros entram em social: o clique veio de uma conversa, não de um site parceiro.
  {
    canonica: 'whatsapp',
    grupo: 'social',
    exatos: ['whatsapp', 'wa.me'],
    rotulos: ['whatsapp'],
    dominios: ['wa.me'],
  },
  { canonica: 'telegram', grupo: 'social', exatos: ['telegram'], rotulos: ['telegram'], dominios: ['t.me'] },
]

/**
 * Marcadores de mídia paga. Substring é obrigatório: a base real tem "pi-cpc", que nunca
 * casaria por igualdade. "paid" cobre paidsocial/paid-social/paid_social.
 */
const MEDIUM_PAGO = /(cpc|ppc|paid|cpm|cpv|adwords|display|retarget|remarket|pmax|performance[-_ ]?max|demandgen)/

/**
 * "ads"/"ad" precisa de fronteira, senão "leads" (que contém "ads") viraria tráfego pago.
 */
const MEDIUM_ADS = /(^|[^a-z])ads?([^a-z]|$)/

function limpar(valor: string | null | undefined): string {
  const v = (valor ?? '').trim().toLowerCase()
  return VALORES_NULOS.has(v) ? '' : v
}

function temValor(valor: string | null | undefined): boolean {
  return limpar(valor).length > 0
}

/**
 * `referrer_domain` já costuma vir como domínio puro, mas aceita URL completa para o caso de
 * quem chamar com `referrer_url`. Remove "www." para que www.google.com e google.com agrupem.
 */
function extrairHost(valor: string | null | undefined): string {
  const bruto = limpar(valor)
  if (!bruto) return ''
  try {
    const url = new URL(bruto.includes('://') ? bruto : `https://${bruto}`)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return bruto.replace(/^www\./, '')
  }
}

function ehDominioProprio(host: string): boolean {
  return host === DOMINIO_PROPRIO || host.endsWith(`.${DOMINIO_PROPRIO}`)
}

/** Igualdade ou sufixo com ponto: `x.com` casa `x.com` e `mobile.x.com`, nunca `olx.com.br`. */
function casaDominio(valor: string, dominio: string): boolean {
  return valor === dominio || valor.endsWith(`.${dominio}`)
}

/**
 * Nenhuma comparação aqui é substring solta: substring é o que fazia `olx.com.br` casar com
 * "x.com" e `algumfb.com.br` casar com "fb.com". Todo casamento respeita fronteira de host —
 * rótulo DNS inteiro ou domínio inteiro.
 */
function acharPlataforma(valor: string): Plataforma | null {
  if (!valor) return null
  const rotulos = valor.split('.')
  for (const p of PLATAFORMAS) {
    if (p.exatos?.includes(valor)) return p
    if (p.dominios?.some((d) => casaDominio(valor, d))) return p
    if (p.rotulos?.some((r) => rotulos.includes(r))) return p
  }
  return null
}

/**
 * Nome canônico da fonte, para agrupar no dashboard: "Google" e "google" viram "google";
 * "ig", "fb" e "instagram" viram "meta". Sem fonte identificável, devolve o próprio valor
 * limpo (ou o host do referrer), preservando a cauda longa em vez de jogá-la fora.
 */
export function normalizarFonte(sessao: SessaoAtribuicao): string {
  const fonte = limpar(sessao.utm_source)
  const host = extrairHost(sessao.referrer_domain)

  const plataforma = acharPlataforma(fonte) ?? (fonte ? null : acharPlataforma(host))
  if (plataforma) return plataforma.canonica

  if (fonte) return fonte
  if (temValor(sessao.gclid)) return 'google'
  if (temValor(sessao.fbclid)) return 'meta'
  if (temValor(sessao.ttclid)) return 'tiktok'
  if (host && !ehDominioProprio(host)) return host
  return SEM_FONTE
}

/**
 * Rótulo EXIBÍVEL da campanha: apara espaços, colapsa espaços internos e transforma
 * null/vazio em rótulo estável. Preserva a caixa original — "Black Friday" continua
 * "Black Friday" na tela; quem agrupa é `chaveCampanha`.
 */
export function normalizarCampanha(campanha: string | null | undefined): string {
  const limpa = (campanha ?? '').trim().replace(/\s+/g, ' ')
  if (!limpa || VALORES_NULOS.has(limpa.toLowerCase())) return SEM_CAMPANHA
  return limpa
}

/**
 * Chave de AGRUPAMENTO da campanha. Sem ela, "Black Friday" e "black friday" viram duas linhas
 * na tabela — a mesma sujeira de caixa que `normalizarFonte` já resolve para a fonte. Quem
 * agrupa por esta chave deve exibir o rótulo de `normalizarCampanha` (a versão legível), não a
 * chave em minúsculas.
 */
export function chaveCampanha(campanha: string | null | undefined): string {
  const rotulo = normalizarCampanha(campanha)
  return rotulo === SEM_CAMPANHA ? SEM_CAMPANHA : rotulo.toLowerCase()
}

export function classificarCanal(sessao: SessaoAtribuicao): CanalTrafego {
  const fonte = limpar(sessao.utm_source)
  const medium = limpar(sessao.utm_medium)
  const host = extrairHost(sessao.referrer_domain)

  const temGclid = temValor(sessao.gclid)
  const temFbclid = temValor(sessao.fbclid)
  const temTtclid = temValor(sessao.ttclid)
  const temClickId = temGclid || temFbclid || temTtclid

  // Referrer do próprio site é navegação interna, não referência: ignora o host.
  const hostExterno = host && !ehDominioProprio(host) ? host : ''

  // Plataforma: utm_source manda (foi o anunciante quem marcou); depois o click id; por
  // último o referrer, que é o único sinal das sessões sem UTM nenhuma. O referrer só entra
  // quando não há utm_source — com source preenchido, quem navegou por dentro de um webmail
  // ou de um encurtador não deve reescrever a marcação da campanha.
  const plataforma =
    acharPlataforma(fonte) ??
    (temGclid ? acharPlataforma('google') : null) ??
    (temFbclid ? acharPlataforma('meta') : null) ??
    (temTtclid ? acharPlataforma('tiktok') : null) ??
    (fonte ? null : acharPlataforma(hostExterno))

  const grupo = plataforma?.grupo ?? null

  // Pago: o utm_medium explícito tem precedência sobre o click id. Motivo prático — o fbclid
  // é anexado pela Meta em QUALQUER link, inclusive em post orgânico e link da bio; tratá-lo
  // como prova de mídia paga inflaria "social pago" com tráfego que ninguém pagou. Quando o
  // medium está vazio, aí sim o click id decide (é o caso "gclid sem utm").
  const pago = medium
    ? MEDIUM_PAGO.test(medium) || MEDIUM_ADS.test(medium)
    : temClickId

  // IA vem antes de tudo: mesmo que um dia venha marcada como paga, é o canal que interessa ler.
  if (grupo === 'ia') return 'assistente_ia'

  if (pago) {
    if (grupo === 'busca') return 'busca_paga'
    if (grupo === 'social') return 'social_pago'
    // Mídia comprada em plataforma que não sabemos nomear (portal de classificados, rede de
    // display regional, o "pi-cpc" que existe na base). Canal próprio, e não 'outro': jogado
    // em 'outro' ficaria misturado com e-mail e QR code impresso, e verba comprovadamente
    // paga sumiria da leitura de investimento — que é a pergunta desta tela.
    return 'outra_midia_paga'
  }

  if (grupo === 'busca') return 'busca_organica'
  if (grupo === 'social') return 'social_organico'

  // Marcada com UTM mas fora dos grupos conhecidos (e-mail, parceiro, QR code impresso...).
  if (fonte || medium) return 'outro'

  if (hostExterno) return 'referencia'

  // Sem UTM, sem click id e sem referrer externo.
  return 'direto'
}

export const CANAL_ROTULOS: Record<CanalTrafego, string> = {
  busca_paga: 'Busca paga',
  social_pago: 'Social pago',
  outra_midia_paga: 'Outra mídia paga',
  busca_organica: 'Busca orgânica',
  social_organico: 'Social orgânico',
  assistente_ia: 'Assistente de IA',
  direto: 'Direto',
  referencia: 'Referência',
  outro: 'Outro',
}

/**
 * Tokens de classe utilitária (mesmo padrão dos badges do /admin/visitors), legíveis em tema
 * claro e escuro. É só string: este arquivo não importa nada de UI.
 */
export const CANAL_CORES: Record<CanalTrafego, string> = {
  busca_paga: 'bg-blue-500/10 text-blue-500',
  social_pago: 'bg-indigo-500/10 text-indigo-500',
  // Mesma família fria dos outros pagos, para a dona do marketing bater o olho e ver "isso é verba".
  outra_midia_paga: 'bg-sky-500/10 text-sky-500',
  busca_organica: 'bg-emerald-500/10 text-emerald-500',
  social_organico: 'bg-teal-500/10 text-teal-500',
  assistente_ia: 'bg-violet-500/10 text-violet-500',
  direto: 'bg-gray-500/10 text-gray-500',
  referencia: 'bg-amber-500/10 text-amber-500',
  outro: 'bg-slate-500/10 text-slate-500',
}

/** Ordem estável para tabelas e legendas: pago primeiro, cauda no fim. */
export const CANAIS_ORDEM: CanalTrafego[] = [
  'busca_paga',
  'social_pago',
  'outra_midia_paga',
  'busca_organica',
  'social_organico',
  'assistente_ia',
  'referencia',
  'direto',
  'outro',
]

export function rotuloCanal(canal: CanalTrafego): string {
  return CANAL_ROTULOS[canal]
}

export function corCanal(canal: CanalTrafego): string {
  return CANAL_CORES[canal]
}
