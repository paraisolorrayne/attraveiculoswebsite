// Leitura de robots.txt pelas regras da RFC 9309, as mesmas que Google, Bing e
// OpenAI documentam: grupo pelo nome do robô (sem diferenciar maiúsculas), o
// grupo `*` só para quem não tem grupo próprio, regra mais longa vence e, no
// empate, Allow vence; `*` casa qualquer sequência e `$` ancora no fim.
//
// Existe para o teste das regras (src/lib/seo/regras-robots.ts) e a auditoria
// de produção (scripts/auditar-catalogo-publico.mjs) responderem a mesma
// pergunta — "este robô pode abrir este caminho?" — sem dependência externa.

/**
 * @typedef {{ tipo: 'allow' | 'disallow', caminho: string }} Regra
 * @typedef {{ agentes: string[], regras: Regra[] }} Grupo
 * @typedef {{ grupos: Grupo[], sitemaps: string[], outras: { campo: string, valor: string }[] }} Robots
 */

/** @param {string} texto @returns {Robots} */
export function lerRobots(texto) {
  /** @type {Grupo[]} */
  const grupos = []
  const sitemaps = []
  const outras = []
  /** @type {Grupo | null} */
  let atual = null
  let lendoAgentes = false

  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.replace(/#.*$/, '').trim()
    const m = linha.match(/^([A-Za-z-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const campo = m[1].toLowerCase()
    const valor = m[2].trim()

    if (campo === 'user-agent') {
      // Linhas de user-agent seguidas formam um grupo só; uma depois de regras
      // abre outro.
      if (!lendoAgentes) {
        atual = { agentes: [], regras: [] }
        grupos.push(atual)
      }
      atual.agentes.push(valor.toLowerCase())
      lendoAgentes = true
    } else if (campo === 'allow' || campo === 'disallow') {
      lendoAgentes = false
      // `Disallow:` vazio não é regra (RFC 9309, 2.2.2).
      if (atual && valor) atual.regras.push({ tipo: campo, caminho: valor })
    } else if (campo === 'sitemap') {
      sitemaps.push(valor)
    } else {
      outras.push({ campo, valor })
    }
  }
  return { grupos, sitemaps, outras }
}

/**
 * As regras que valem para um robô: as de todos os grupos com o nome dele; sem
 * nenhum, as do primeiro nome de `reservas` que tiver grupo (o Googlebot-Image
 * cai no Googlebot, por exemplo); sem nenhum, as do `*`.
 *
 * @param {Robots} robots @param {string} agente @param {string[]} [reservas]
 * @returns {{ grupo: string, regras: Regra[] }}
 */
export function regrasPara(robots, agente, reservas = []) {
  for (const nome of [agente, ...reservas, '*'].map(n => n.toLowerCase())) {
    const deste = robots.grupos.filter(g => g.agentes.includes(nome))
    if (deste.length) return { grupo: nome, regras: deste.flatMap(g => g.regras) }
  }
  return { grupo: '(nenhum)', regras: [] }
}

/** @param {string} padrao @param {string} caminho */
export function casa(padrao, caminho) {
  const ancorado = padrao.endsWith('$')
  const corpo = ancorado ? padrao.slice(0, -1) : padrao
  const re = corpo.split('*').map(p => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')
  return new RegExp(`^${re}${ancorado ? '$' : ''}`).test(caminho)
}

/**
 * Este robô pode abrir este caminho (com a query, se houver)?
 *
 * @param {Robots} robots @param {string} agente @param {string} caminho
 * @param {{ reservas?: string[] }} [opcoes]
 * @returns {{ permitido: boolean, regra: Regra | null, grupo: string }}
 */
export function decidir(robots, agente, caminho, opcoes = {}) {
  const { grupo, regras } = regrasPara(robots, agente, opcoes.reservas)
  if (caminho === '/robots.txt') return { permitido: true, regra: null, grupo }

  /** @type {Regra | null} */
  let vencedora = null
  for (const regra of regras) {
    if (!casa(regra.caminho, caminho)) continue
    const tamanho = regra.caminho.length
    const atual = vencedora?.caminho.length ?? -1
    if (tamanho > atual || (tamanho === atual && regra.tipo === 'allow')) vencedora = regra
  }
  return { permitido: vencedora?.tipo !== 'disallow', regra: vencedora, grupo }
}
