/**
 * Meta Pixel — os eventos que ligam o site ao catálogo de veículos.
 *
 * O PROBLEMA QUE ISTO RESOLVE. A taxa de correspondência entre o pixel e o
 * catálogo `Catalog_Vehicles_Attra` estava em 0% (diagnóstico de 27/09/2026),
 * o que bloqueia anúncio dinâmico. Os eventos chegavam à Meta, mas SEM
 * parâmetro nenhum — `fbq('trackSingle', <id>, 'ViewContent', {})`. Sem
 * `content_ids` e `content_type` não há o que casar com o feed, e os quatro
 * eventos apareciam como "Ausente" no Gerenciador de Comércio.
 *
 * O feed não precisou mudar: o `vehicle_id` do catálogo JÁ é o número no fim do
 * slug (`/veiculo/mercedes-g-63-2019-1006232` → `1006232`), o mesmo que o
 * `data-vehicle-id` dos cards e o que o pixel do OpenAI já manda como
 * `content_id`. A correção é só mandar esse número junto com o evento.
 *
 * ONDE O PIXEL É CARREGADO. Não aqui: o código-base (`fbq('init', ...)`) vem de
 * uma tag dentro do GTM, e é por isso que `fbq` não existe em lugar nenhum do
 * repositório. Este módulo NÃO carrega nem inicializa o pixel — ele só manda
 * eventos para o que o GTM já iniciou, e por isso usa `trackSingle` com o ID
 * explícito: a página pode ter mais de um pixel, e `track` puro dispararia em
 * todos eles.
 */

/**
 * O ID fica no código, e não em `NEXT_PUBLIC_*` como o pixel do OpenAI.
 *
 * Não é segredo — ele aparece no HTML de toda página, e teria de ser igual ao
 * da tag do GTM de qualquer jeito. Em variável de ambiente, esquecer de
 * defini-la na VPS não daria erro nenhum: os eventos simplesmente parariam de
 * sair, que é exatamente o defeito silencioso que este arquivo existe para
 * consertar.
 */
const PIXEL_ID = '1228434935031776'

/**
 * `vehicle`, nunca `product`.
 *
 * Catálogo de veículos é um vertical próprio da Meta, com `vehicle_id` como
 * chave. Mandar `product` faz o evento não casar com item nenhum — e não dá
 * erro, só volta a 0%.
 */
const CONTENT_TYPE = 'vehicle'

/** Quanto tempo esperar o GTM publicar o `fbq` antes de desistir do evento. */
const LIMITE_DE_ESPERA_MS = 10_000

/** De quanto em quanto tempo olhar se o `fbq` já apareceu. */
const INTERVALO_DE_ESPERA_MS = 200

/** Teto do `search_string` — o que passa disso é ruído para a Meta. */
const LIMITE_BUSCA = 100

export type EventoDeVeiculo = 'ViewContent' | 'Lead' | 'AddToWishlist' | 'Search'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

/**
 * Quantos dígitos um `vehicle_id` tem, no mínimo.
 *
 * O id do AutoConf é chave de banco na casa das centenas de milhares: no
 * estoque de hoje são 6 ou 7 dígitos (`916079`, `1006232`, `1106704`). Os
 * números que ANDAM JUNTO no slug são curtos — ano (`2019`, quatro) e
 * designação de modelo (`63`, `911`, `488`, dois ou três).
 *
 * Sem este piso, `mercedes-g-63` (slug sem id) devolveria `63`, e um id que não
 * existe no feed é pior que id nenhum: conta como correspondência tentada e
 * falhada, em vez de ficar de fora da conta.
 */
const MINIMO_DE_DIGITOS = 5

/**
 * O `vehicle_id` do catálogo, tirado do slug.
 *
 * É o número no fim: `mercedes-g-63-2019-1006232` → `1006232`. O mesmo valor
 * que o feed publica, que o `data-vehicle-id` dos cards carrega e que o
 * `Vehicle.id` guarda (`autoconf-api.ts` monta o slug com ele no fim).
 */
export function vehicleIdFromSlug(slug: string): string | null {
  const id = slug.match(/(\d+)\/?$/)?.[1]
  return id && id.length >= MINIMO_DE_DIGITOS ? id : null
}

/**
 * O `vehicle_id` a partir do caminho da URL — só em ficha de veículo.
 *
 * Os ouvintes por delegação não recebem prop nenhuma: só têm o
 * `window.location.pathname`. Ancorar em `/veiculo/` é o que impede um post do
 * blog (`/blog/top-10-suvs-2025`) de virar o "veículo 2025" — o ano no fim do
 * título casaria com qualquer regra que só olhasse o fim da URL.
 */
export function vehicleIdFromPath(pathname: string): string | null {
  const slug = pathname.match(/^\/veiculo\/([^/?#]+)\/?$/)?.[1]
  return slug ? vehicleIdFromSlug(slug) : null
}

/**
 * Espera o `fbq` existir antes de disparar.
 *
 * O GTM é carregado `beforeInteractive`, mas o `gtm.js` é `async` e a tag do
 * pixel só roda depois que ele baixa. Um `useEffect` de página pode rodar
 * antes disso. Sem esta espera, `if (!window.fbq) return` derrubaria em
 * silêncio justamente o `ViewContent` de quem acabou de chegar pelo anúncio —
 * o evento mais importante dos quatro, perdido só nas conexões lentas, que é
 * o tipo de defeito que não se reproduz na mesa de quem programou.
 *
 * Depois que o código-base da Meta roda, `fbq` já é uma FILA: evento disparado
 * antes do `fbevents.js` terminar de carregar é guardado e reenviado sozinho.
 * Então basta esperar a função aparecer, não o SDK inteiro.
 */
let esperando = false
const pendentes: Array<() => void> = []

function quandoOPixelExistir(disparar: () => void): void {
  if (window.fbq) {
    disparar()
    return
  }

  pendentes.push(disparar)
  if (esperando) return
  esperando = true

  const comecou = Date.now()
  const relogio = setInterval(() => {
    const apareceu = !!window.fbq
    const desistiu = Date.now() - comecou > LIMITE_DE_ESPERA_MS
    if (!apareceu && !desistiu) return

    clearInterval(relogio)
    esperando = false
    const fila = pendentes.splice(0)
    // Desistiu: descarta. Evento de dez segundos atrás chegaria depois da
    // pessoa já ter saído da página, e ainda assim contaria como visualização.
    if (apareceu) fila.forEach(fn => fn())
  }, INTERVALO_DE_ESPERA_MS)
}

/**
 * Os eventos que descrevem o ESTADO da página, e por isso não se repetem.
 *
 * `ViewContent` e `Search` saem de um `useEffect`: o StrictMode do React monta
 * todo efeito duas vezes em desenvolvimento, e qualquer remontagem do
 * componente repetiria o evento — foi o que apareceu na listagem, com dois
 * `Search` idênticos. O critério de aceite pede UM `ViewContent` por página.
 *
 * `Lead` e `AddToWishlist` ficam de fora porque são AÇÃO da pessoa: dois
 * cliques no WhatsApp do mesmo carro são dois leads, e engoli-los esconderia
 * interesse real.
 */
const EVENTOS_DE_ESTADO: ReadonlySet<string> = new Set<EventoDeVeiculo>(['ViewContent', 'Search'])

/**
 * A última chamada de cada evento de estado.
 *
 * Guardar só a ÚLTIMA (em vez de tudo que já passou) é de propósito: ir do
 * carro A para o B e voltar para o A é uma segunda visualização de verdade, e
 * tem de ser contada.
 */
const ultimaChamada = new Map<string, string>()

/**
 * Manda um evento de veículo para o pixel.
 *
 * Silenciosamente não faz nada sem `ids` — evento de catálogo sem
 * `content_ids` é o defeito que estamos consertando, então é melhor não
 * mandá-lo do que mandá-lo vazio.
 */
export function trackVehicle(
  evento: EventoDeVeiculo,
  ids: Array<string | number | null | undefined>,
  extra: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return

  // `String` em tudo e fora os vazios: o feed publica o id como texto, e
  // `content_ids: [1006232]` (número) não casa com `"1006232"` (texto).
  const conteudo = ids.filter(id => id !== null && id !== undefined && id !== '').map(String)
  if (conteudo.length === 0) return

  if (EVENTOS_DE_ESTADO.has(evento)) {
    const assinatura = JSON.stringify([conteudo, extra])
    if (ultimaChamada.get(evento) === assinatura) return
    ultimaChamada.set(evento, assinatura)
  }

  quandoOPixelExistir(() => {
    window.fbq?.('trackSingle', PIXEL_ID, evento, {
      content_type: CONTENT_TYPE,
      content_ids: conteudo,
      ...extra,
    })
  })
}

/**
 * `value` + `currency` para `ViewContent` e `Lead`.
 *
 * Preço ausente, zero ou não numérico sai como `{}` em vez de `value: 0`: zero
 * é um número válido para a Meta, entra no cálculo de retorno e rebaixa a média
 * de todo mundo. Faltar o valor atrapalha menos que um valor errado.
 */
export function valorEmReais(preco: unknown): Record<string, unknown> {
  const numero = typeof preco === 'string' ? Number(preco.replace(/[^\d.-]/g, '')) : Number(preco)
  if (!Number.isFinite(numero) || numero <= 0) return {}
  return { value: numero, currency: 'BRL' }
}

/**
 * `search_string` limpo.
 *
 * Corta o tamanho e recusa o que tem cara de e-mail ou telefone. A regra da
 * Meta proíbe dado pessoal nos parâmetros, e campo de busca é texto livre: não
 * dá para garantir o que a pessoa digita, então o filtro fica aqui e não na
 * confiança de quem chama.
 */
export function buscaSegura(termo: string | null | undefined): Record<string, unknown> {
  const limpo = (termo ?? '').trim().slice(0, LIMITE_BUSCA)
  if (!limpo) return {}
  const pareceEmail = /\S+@\S+/.test(limpo)
  const pareceTelefone = /(?:\D*\d){8,}/.test(limpo)
  if (pareceEmail || pareceTelefone) return {}
  return { search_string: limpo }
}

/** Só para os testes: zera o estado entre casos. */
export function __resetParaTeste(): void {
  ultimaChamada.clear()
  pendentes.length = 0
  esperando = false
}
