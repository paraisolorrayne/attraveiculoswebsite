import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import nextConfig from '../../../next.config'

/**
 * A CSP do site contra o que a medição precisa para funcionar.
 *
 * Em 26/11/2026, um alerta de fora mostrou o console do site com pedidos de
 * medição bloqueados. Reproduzido no ar, com os envios interceptados:
 *
 * - O pixel da OpenAI (ligado em 08/08) nunca carregou: o `script-src` não
 *   tinha o endereço do SDK, e o `connect-src` não tinha o dos eventos.
 * - O pixel da Meta só chegava à Meta dentro do app do Instagram e do
 *   Facebook. Fora dele, o evento passa de 2.048 caracteres (6 a 13 mil na
 *   home e na ficha), e o `fbevents.js` troca a imagem por `sendBeacon` ou
 *   `fetch`, que o `connect-src` barrava. A reserva, um POST por formulário
 *   num iframe, caía no `form-action` e no `frame-src`.
 *
 * Nada disso aparecia na tela. Estes testes leem a CSP do `next.config.ts`,
 * que é a que vai no cabeçalho de toda página.
 */

async function diretivasDaCsp(): Promise<Map<string, string[]>> {
  const regras = await nextConfig.headers!()
  const todasAsPaginas = regras.find((r) => r.source === '/:path*')
  const csp = todasAsPaginas?.headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? ''
  return new Map(
    csp
      .split(';')
      .map((diretiva) => diretiva.trim().split(/\s+/))
      .filter(([nome]) => nome)
      .map(([nome, ...fontes]) => [nome, fontes]),
  )
}

/**
 * Se a lista de fontes de uma diretiva libera a URL. Cobre as formas usadas
 * nesta CSP: esquema solto (`https:`), host exato e curinga de subdomínio
 * (`https://*.clarity.ms`).
 */
function libera(fontes: string[] | undefined, url: string): boolean {
  const { protocol, hostname } = new URL(url)
  return (fontes ?? []).some((fonte) => {
    if (fonte === protocol) return true
    const partes = fonte.match(/^(https?:)\/\/(\*\.)?([^/:]+)/)
    if (!partes) return false
    const [, esquema, curinga, host] = partes
    if (esquema !== protocol) return false
    return curinga ? hostname.endsWith(`.${host}`) : hostname === host
  })
}

/** Os scripts externos que os componentes de medição carregam, tirados do próprio código. */
function scriptsDosComponentesDeMedicao(): string[] {
  const pasta = path.resolve(__dirname, '../../components/analytics')
  const urls = new Set<string>()
  for (const arquivo of readdirSync(pasta).filter((a) => a.endsWith('.tsx'))) {
    const codigo = readFileSync(path.join(pasta, arquivo), 'utf8')
    for (const [url] of codigo.matchAll(/https:\/\/[\w.-]+\/[^"'`\s]*?(?:\.js\b|gtag\/js|tag\/)/g)) {
      urls.add(url)
    }
  }
  return [...urls]
}

describe('CSP e medição', () => {
  it('libera todo script externo dos componentes de medição', async () => {
    const scriptSrc = (await diretivasDaCsp()).get('script-src')
    const scripts = scriptsDosComponentesDeMedicao()
    // GTM, GA4, Clarity e o SDK da OpenAI: se a lista encolher, a busca acima quebrou.
    expect(scripts.length).toBeGreaterThanOrEqual(4)
    expect(scripts.filter((url) => !libera(scriptSrc, url))).toEqual([])
  })

  it('deixa o pixel da OpenAI baixar a configuração e mandar os eventos', async () => {
    const csp = await diretivasDaCsp()
    expect(libera(csp.get('script-src'), 'https://bzrcdn.openai.com/sdk/oaiq.min.js')).toBe(true)
    // Depois de carregar, o SDK busca por fetch a configuração do pixel no mesmo CDN.
    expect(libera(csp.get('connect-src'), 'https://bzrcdn.openai.com/pixel-config/v1/pixel.json')).toBe(true)
    expect(libera(csp.get('connect-src'), 'https://bzr.openai.com/v1/sdk/events')).toBe(true)
  })

  it('deixa o pixel da Meta carregar e mandar evento grande por sendBeacon ou fetch', async () => {
    const csp = await diretivasDaCsp()
    expect(libera(csp.get('script-src'), 'https://connect.facebook.net/en_US/fbevents.js')).toBe(true)
    expect(libera(csp.get('img-src'), 'https://www.facebook.com/tr/')).toBe(true)
    expect(libera(csp.get('connect-src'), 'https://www.facebook.com/tr/')).toBe(true)
  })

  it('deixa a reserva do pixel da Meta: POST por formulário num iframe', async () => {
    const csp = await diretivasDaCsp()
    expect(libera(csp.get('form-action'), 'https://www.facebook.com/tr/')).toBe(true)
    expect(libera(csp.get('frame-src'), 'https://www.facebook.com/')).toBe(true)
  })

  it('continua fechando o resto: formulário só para o próprio site e para a Meta', async () => {
    const formAction = (await diretivasDaCsp()).get('form-action')
    expect(formAction).toEqual(["'self'", 'https://www.facebook.com'])
  })
})
