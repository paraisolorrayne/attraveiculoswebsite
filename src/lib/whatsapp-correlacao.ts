/**
 * Atribuição do lead que chega por WhatsApp, sem marcador na mensagem.
 *
 * A mensagem do wa.me é a única coisa que viaja do site até a loja — não há
 * canal lateral. Por isso a origem viajava embutida no texto que o COMPRADOR
 * envia ("[ref: ...]"). Tirar o marcador da mensagem exige outro caminho: no
 * clique gravamos a sessão e o instante; quando a conversa chega, procuramos o
 * clique compatível.
 *
 * É correlação por tempo, e portanto MENOS certa que o marcador. As duas regras
 * abaixo existem para que ela erre por omissão, nunca por invenção:
 *
 *   1. um clique atribui UMA conversa (`consumido_em`);
 *   2. havendo mais de um candidato na janela, NÃO escolhe.
 *
 * A segunda é a que importa. Atribuir a sessão errada contamina campanha, termo
 * e canal de um lead real — foi exatamente esse o estrago da colisão de
 * visitor_id que corrigimos antes. Ausente é recuperável; errado não.
 */

/** Janela de correlação. Curta de propósito: o clique abre o WhatsApp na hora. */
export const JANELA_CORRELACAO_MS = 10 * 60 * 1000

export interface CliqueCandidato {
  id: string
  session_db_id: string
  clicked_at: Date | string
}

export type ResultadoCorrelacao =
  | { tipo: 'certa'; sessionId: string; cliqueId: string }
  | { tipo: 'ambigua'; candidatos: number }
  | { tipo: 'sem_candidato' }

/**
 * Escolhe o clique que originou uma conversa, ou recusa.
 *
 * `quando` é o instante da conversa informado pelo CRM. Cliques posteriores a
 * ele são descartados: o clique precede a mensagem, nunca o contrário.
 */
export function correlacionarClique(
  candidatos: CliqueCandidato[],
  quando: Date,
  janelaMs: number = JANELA_CORRELACAO_MS,
): ResultadoCorrelacao {
  const limite = quando.getTime() - janelaMs

  const naJanela = candidatos.filter(c => {
    const t = new Date(c.clicked_at).getTime()
    if (Number.isNaN(t)) return false
    // Estritamente anterior (com 30s de folga para relógios dessincronizados
    // entre o nosso servidor e o do CRM).
    return t <= quando.getTime() + 30_000 && t >= limite
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
