import { describe, it, expect } from 'vitest'
import {
  correlacionarClique,
  veiculoCompativel,
  JANELA_CORRELACAO_MS,
  type CliqueCandidato,
} from '../whatsapp-correlacao'

const AGORA = new Date('2026-08-05T18:00:00Z')
const emT = (msAtras: number) => new Date(AGORA.getTime() - msAtras).toISOString()

const FERRARI_296 = { marca: 'Ferrari', modelo: '296 GTB', slug: 'ferrari-296-2025-1099157' }
const PORSCHE_911 = { marca: 'Porsche', modelo: '911 Turbo S', slug: 'porsche-911-turbo-s-2024-1066415' }

function clique(id: string, sessao: string, msAtras: number, veiculo: CliqueCandidato['veiculo'] = FERRARI_296): CliqueCandidato {
  return { id, session_db_id: sessao, clicked_at: emT(msAtras), veiculo }
}

/**
 * Esta função decide de qual campanha um lead veio. Errar aqui não deixa rastro
 * visível: o painel mostra um número plausível e a decisão de mídia é tomada em
 * cima dele.
 *
 * Até 02/10/2026 a regra era "um só clique na janela = é dele", e ela errou a
 * maioria: muitos leads não vêm de clique gravado (anúncio direto no WhatsApp,
 * clique perdido), e aí o clique de OUTRA pessoa era atribuído ao lead. Hoje o
 * clique só liga se for do MESMO carro que o card pede.
 */
describe('correlação de clique do WhatsApp', () => {
  it('liga quando o único clique da janela é do mesmo carro do card', () => {
    const r = correlacionarClique([clique('c1', 's1', 60_000)], AGORA, 'Ferrari 296 GTB 2025')
    expect(r).toEqual({ tipo: 'certa', sessionId: 's1', cliqueId: 'c1' })
  })

  it('NÃO liga clique de outro carro, mesmo sendo o único da janela', () => {
    // Caso real de 08/09: card de Audi RS6 ligado a clique na ficha de um Porsche.
    const r = correlacionarClique([clique('c1', 's1', 60_000, PORSCHE_911)], AGORA, 'Audi RS6 Avant Performance')
    expect(r).toEqual({ tipo: 'sem_candidato' })
  })

  it('NÃO liga clique sem veículo (botão flutuante, página inicial)', () => {
    const r = correlacionarClique([clique('c1', 's1', 60_000, null)], AGORA, 'Ferrari 296')
    expect(r).toEqual({ tipo: 'sem_candidato' })
  })

  it('card que não diz o carro não liga a nada', () => {
    expect(correlacionarClique([clique('c1', 's1', 60_000)], AGORA, null)).toEqual({ tipo: 'sem_veiculo' })
    expect(correlacionarClique([clique('c1', 's1', 60_000)], AGORA, '  ')).toEqual({ tipo: 'sem_veiculo' })
  })

  it('o clique de outro carro na janela não atrapalha o do carro certo', () => {
    const r = correlacionarClique(
      [clique('c1', 's1', 60_000), clique('c2', 's2', 90_000, PORSCHE_911)],
      AGORA,
      'Ferrari 296',
    )
    expect(r).toEqual({ tipo: 'certa', sessionId: 's1', cliqueId: 'c1' })
  })

  it('RECUSA quando duas sessões clicaram no mesmo carro na janela', () => {
    const r = correlacionarClique([clique('c1', 's1', 60_000), clique('c2', 's2', 90_000)], AGORA, 'Ferrari 296')
    expect(r).toEqual({ tipo: 'ambigua', candidatos: 2 })
  })

  it('não trata cliques repetidos da MESMA pessoa como ambiguidade', () => {
    const r = correlacionarClique([clique('c1', 's1', 300_000), clique('c2', 's1', 30_000)], AGORA, 'Ferrari 296')
    // Fica com o mais próximo da mensagem.
    expect(r).toEqual({ tipo: 'certa', sessionId: 's1', cliqueId: 'c2' })
  })

  it('ignora clique anterior à janela', () => {
    const r = correlacionarClique([clique('c1', 's1', JANELA_CORRELACAO_MS + 60_000)], AGORA, 'Ferrari 296')
    expect(r).toEqual({ tipo: 'sem_candidato' })
  })

  it('ignora clique POSTERIOR à mensagem — o clique precede, nunca sucede', () => {
    const r = correlacionarClique([clique('c1', 's1', -5 * 60_000)], AGORA, 'Ferrari 296')
    expect(r).toEqual({ tipo: 'sem_candidato' })
  })

  it('tolera relógios levemente dessincronizados entre nós e o CRM', () => {
    const r = correlacionarClique([clique('c1', 's1', -20_000)], AGORA, 'Ferrari 296')
    expect(r.tipo).toBe('certa')
  })

  it('sem candidato nenhum, devolve sem_candidato em vez de inventar', () => {
    expect(correlacionarClique([], AGORA, 'Ferrari 296')).toEqual({ tipo: 'sem_candidato' })
  })

  it('descarta data inválida sem quebrar', () => {
    const r = correlacionarClique(
      [{ ...clique('c1', 's1', 0), clicked_at: 'data-quebrada' }, clique('c2', 's2', 60_000)],
      AGORA,
      'Ferrari 296',
    )
    expect(r).toEqual({ tipo: 'certa', sessionId: 's2', cliqueId: 'c2' })
  })
})

describe('veiculoCompativel', () => {
  it('casa marca e modelo, ignorando caixa, acento, ano e versão', () => {
    expect(veiculoCompativel('FERRARI 296 GTB', FERRARI_296)).toBe(true)
    expect(veiculoCompativel('Porsche 911 Carrera Coupé', PORSCHE_911)).toBe(true)
  })

  it('recusa marca certa com modelo errado, e modelo sem marca', () => {
    expect(veiculoCompativel('Porsche Cayenne', PORSCHE_911)).toBe(false)
    expect(veiculoCompativel('BMW 911', PORSCHE_911)).toBe(false)
  })

  it('recusa os cards reais que foram ligados errado', () => {
    expect(veiculoCompativel('Carro do cliente para venda', FERRARI_296)).toBe(false)
    expect(veiculoCompativel('Boa tarde [mídia] image:', FERRARI_296)).toBe(false)
    expect(veiculoCompativel('BMW X2 M35i Turbo 306cv', PORSCHE_911)).toBe(false)
  })

  it('entende as marcas de nome composto e o AMG sozinho', () => {
    const rangeSport = { marca: 'Land Rover', modelo: 'Range Rover Sport', slug: 'land-rover-range-rover-sport-2024-1' }
    expect(veiculoCompativel('Range Rover Sport HSE', rangeSport)).toBe(true)
    const amgGt = { marca: 'Mercedes-Benz', modelo: 'AMG GT 63 S', slug: 'mercedes-gt-2025-916079' }
    expect(veiculoCompativel('Mercedes AMG GT 63', amgGt)).toBe(true)
    expect(veiculoCompativel('AMG GT 63 S', amgGt)).toBe(true)
  })

  it('usa o slug quando a página não deu marca e modelo', () => {
    expect(veiculoCompativel('Ferrari 296', { marca: null, modelo: null, slug: 'ferrari-296-2025-1099157' })).toBe(true)
    // Slug sem marca (acontece: "sf90-2024-1062018"): o modelo, se distintivo, basta.
    expect(veiculoCompativel('Ferrari SF90 Stradale', { marca: null, modelo: null, slug: 'sf90-2024-1062018' })).toBe(true)
  })

  it('sem nada do veículo, não casa', () => {
    expect(veiculoCompativel('Ferrari 296', null)).toBe(false)
    expect(veiculoCompativel('Ferrari 296', { marca: null, modelo: null, slug: null })).toBe(false)
  })
})
