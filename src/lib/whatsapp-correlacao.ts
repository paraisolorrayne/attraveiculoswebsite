/**
 * Atribuição do lead que chega por WhatsApp, sem marcador na mensagem.
 *
 * A mensagem do wa.me é a única coisa que viaja do site até a loja — não há
 * canal lateral. Por isso a origem viajava embutida no texto que o COMPRADOR
 * envia ("[ref: ...]"). Tirar o marcador da mensagem exige outro caminho: no
 * clique gravamos a sessão e o instante; quando a conversa chega, procuramos o
 * clique compatível.
 *
 * É correlação, e portanto MENOS certa que o marcador. As regras abaixo
 * existem para que ela erre por omissão, nunca por invenção:
 *
 *   1. o clique tem de ser do MESMO carro que o card pede (marca e modelo);
 *   2. um clique atribui UMA conversa (`consumido_em`);
 *   3. havendo mais de uma sessão candidata, NÃO escolhe.
 *
 * A primeira entrou em 02/10/2026. Antes, "um só clique na janela" bastava, e a
 * auditoria mostrou que isso errava a maioria: muitos leads não vêm de clique
 * gravado (anúncio direto no WhatsApp, clique perdido), e o clique de OUTRA
 * pessoa, sozinho na janela, virava a origem do lead — card de Audi RS6 ligado
 * à ficha de um Porsche, "carro do cliente para venda" ligado a uma Ferrari.
 * Atribuir a sessão errada contamina campanha, termo e canal de um lead real.
 * Ausente é recuperável; errado não.
 */

/** Janela de correlação. Curta de propósito: o clique abre o WhatsApp na hora. */
export const JANELA_CORRELACAO_MS = 10 * 60 * 1000

/** O carro do clique: o que a página sabia (marca/modelo) e o slug da ficha. */
export interface VeiculoDoClique {
  marca: string | null
  modelo: string | null
  slug: string | null
}

export interface CliqueCandidato {
  id: string
  session_db_id: string
  clicked_at: Date | string
  /** null = clique sem veículo (botão flutuante, página inicial): nunca liga sozinho. */
  veiculo: VeiculoDoClique | null
}

export type ResultadoCorrelacao =
  | { tipo: 'certa'; sessionId: string; cliqueId: string }
  | { tipo: 'ambigua'; candidatos: number }
  | { tipo: 'sem_candidato' }
  | { tipo: 'sem_veiculo' }

function palavras(texto: string | null | undefined): string[] {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/** Ano (2025) e id do anúncio no fim do slug (1099157) não descrevem o carro. */
const ehAnoOuId = (p: string) => /^(19|20)\d\d$/.test(p) || /^\d{5,}$/.test(p)

/**
 * Palavras que identificam a marca no texto do card. Marca de nome composto se
 * reconhece pela parte que ninguém omite ("Range Rover" não diz "Land"), e AMG
 * é escrito sozinho tanto quanto "Mercedes".
 */
const CHAVES_DE_MARCA: Record<string, string[]> = {
  mercedes: ['mercedes', 'amg'],
  land: ['rover'],
  rolls: ['rolls'],
  aston: ['aston'],
  alfa: ['alfa'],
}

/**
 * O texto do card pede o mesmo carro do clique? Exige marca E modelo (a
 * primeira palavra do modelo: "911", "296", "x5", "range"). Versão e ano não
 * entram — "911 Carrera" e "911 Turbo S" são o mesmo pedido para a loja.
 * Quando a página não deu a marca, o modelo só basta se for distintivo
 * (três caracteres ou mais, como "sf90").
 */
export function veiculoCompativel(textoDoCard: string | null | undefined, veiculo: VeiculoDoClique | null): boolean {
  if (!veiculo) return false
  const card = new Set(palavras(textoDoCard))
  if (card.size === 0) return false

  const doSlug = palavras(veiculo.slug).filter(p => !ehAnoOuId(p))
  const marca = palavras(veiculo.marca)
  const modeloInformado = palavras(veiculo.modelo).filter(p => !ehAnoOuId(p))
  // Sem modelo da página, o modelo é o que sobra do slug depois da marca.
  const modelo = modeloInformado.length > 0 ? modeloInformado : doSlug.filter(p => !marca.includes(p))
  const chaveModelo = modelo.find(p => !marca.includes(p))
  if (!chaveModelo || !card.has(chaveModelo)) return false

  if (marca.length === 0) return chaveModelo.length >= 3
  const chavesMarca = CHAVES_DE_MARCA[marca[0]] ?? [marca[0]]
  return chavesMarca.some(c => card.has(c))
}

/**
 * Escolhe o clique que originou uma conversa, ou recusa.
 *
 * `quando` é o instante da conversa informado pelo CRM. Cliques posteriores a
 * ele são descartados: o clique precede a mensagem, nunca o contrário.
 */
export function correlacionarClique(
  candidatos: CliqueCandidato[],
  quando: Date,
  veiculoDoCard: string | null | undefined,
  janelaMs: number = JANELA_CORRELACAO_MS,
): ResultadoCorrelacao {
  // Card que não diz o carro não tem como confirmar clique nenhum.
  if (!veiculoDoCard || !veiculoDoCard.trim()) return { tipo: 'sem_veiculo' }
  const limite = quando.getTime() - janelaMs

  const naJanela = candidatos.filter(c => {
    const t = new Date(c.clicked_at).getTime()
    if (Number.isNaN(t)) return false
    // Estritamente anterior (com 30s de folga para relógios dessincronizados
    // entre o nosso servidor e o do CRM).
    return t <= quando.getTime() + 30_000 && t >= limite && veiculoCompativel(veiculoDoCard, c.veiculo)
  })

  if (naJanela.length === 0) return { tipo: 'sem_candidato' }

  // Cliques da MESMA sessão não são ambiguidade: a pessoa clicou duas vezes.
  const sessoes = new Set(naJanela.map(c => c.session_db_id))
  if (sessoes.size > 1) return { tipo: 'ambigua', candidatos: sessoes.size }

  // Dentro da mesma sessão, o clique mais próximo da mensagem.
  const escolhido = naJanela.reduce((a, b) =>
    new Date(b.clicked_at).getTime() > new Date(a.clicked_at).getTime() ? b : a,
  )
  return { tipo: 'certa', sessionId: escolhido.session_db_id, cliqueId: escolhido.id }
}
