import { describe, it, expect } from 'vitest'
import { correlacionarClique, JANELA_CORRELACAO_MS } from '../whatsapp-correlacao'

const AGORA = new Date('2026-08-05T18:00:00Z')
const emT = (msAtras: number) => new Date(AGORA.getTime() - msAtras).toISOString()

/**
 * Esta função decide de qual campanha um lead veio. Errar aqui não deixa rastro
 * visível: o painel mostra um número plausível e a decisão de mídia é tomada em
 * cima dele. O teste central é o da AMBIGUIDADE — a função tem que se recusar a
 * escolher, porque atribuição errada contamina o dado de um lead real e é pior
 * que atribuição ausente.
 */
describe('correlação de clique do WhatsApp', () => {
  it('atribui quando há um único candidato na janela', () => {
    const r = correlacionarClique(
      [{ id: 'c1', session_db_id: 's1', clicked_at: emT(60_000) }],
      AGORA,
    )
    expect(r).toEqual({ tipo: 'certa', sessionId: 's1', cliqueId: 'c1' })
  })

  it('RECUSA quando duas sessões diferentes clicaram na janela', () => {
    const r = correlacionarClique(
      [
        { id: 'c1', session_db_id: 's1', clicked_at: emT(60_000) },
        { id: 'c2', session_db_id: 's2', clicked_at: emT(90_000) },
      ],
      AGORA,
    )
    expect(r).toEqual({ tipo: 'ambigua', candidatos: 2 })
  })

  it('não trata cliques repetidos da MESMA pessoa como ambiguidade', () => {
    // Clicar duas vezes é comum: o cliente volta e clica de novo.
    const r = correlacionarClique(
      [
        { id: 'c1', session_db_id: 's1', clicked_at: emT(300_000) },
        { id: 'c2', session_db_id: 's1', clicked_at: emT(30_000) },
      ],
      AGORA,
    )
    // Fica com o mais próximo da mensagem.
    expect(r).toEqual({ tipo: 'certa', sessionId: 's1', cliqueId: 'c2' })
  })

  it('ignora clique anterior à janela', () => {
    const r = correlacionarClique(
      [{ id: 'c1', session_db_id: 's1', clicked_at: emT(JANELA_CORRELACAO_MS + 60_000) }],
      AGORA,
    )
    expect(r).toEqual({ tipo: 'sem_candidato' })
  })

  it('ignora clique POSTERIOR à mensagem — o clique precede, nunca sucede', () => {
    const r = correlacionarClique(
      [{ id: 'c1', session_db_id: 's1', clicked_at: emT(-5 * 60_000) }],
      AGORA,
    )
    expect(r).toEqual({ tipo: 'sem_candidato' })
  })

  it('tolera relógios levemente dessincronizados entre nós e o CRM', () => {
    // 20s "no futuro" ainda vale: servidores diferentes derivam alguns segundos.
    const r = correlacionarClique(
      [{ id: 'c1', session_db_id: 's1', clicked_at: emT(-20_000) }],
      AGORA,
    )
    expect(r.tipo).toBe('certa')
  })

  it('sem candidato nenhum, devolve sem_candidato em vez de inventar', () => {
    expect(correlacionarClique([], AGORA)).toEqual({ tipo: 'sem_candidato' })
  })

  it('descarta data inválida sem quebrar', () => {
    const r = correlacionarClique(
      [
        { id: 'c1', session_db_id: 's1', clicked_at: 'data-quebrada' },
        { id: 'c2', session_db_id: 's2', clicked_at: emT(60_000) },
      ],
      AGORA,
    )
    // Só o candidato válido sobra — e por isso NÃO é ambíguo.
    expect(r).toEqual({ tipo: 'certa', sessionId: 's2', cliqueId: 'c2' })
  })
})
