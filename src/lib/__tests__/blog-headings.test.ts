import { describe, it, expect } from 'vitest'
import { demoteContentH1 } from '../blog-headings'

describe('demoteContentH1', () => {
  it('rebaixa h1 simples do corpo para h2 marcado', () => {
    expect(demoteContentH1('<h1>Range Rover P530</h1>')).toBe(
      '<h2 data-demoted-h1>Range Rover P530</h2>'
    )
  })

  it('preserva os atributos originais do h1', () => {
    expect(demoteContentH1('<h1 id="topo" class="x">T</h1>')).toBe(
      '<h2 id="topo" class="x" data-demoted-h1>T</h2>'
    )
  })

  it('rebaixa todas as ocorrências e aceita variação de caixa e espaço', () => {
    expect(demoteContentH1('<H1>a</H1><p>x</p><h1>b</h1 >')).toBe(
      '<h2 data-demoted-h1>a</h2><p>x</p><h2 data-demoted-h1>b</h2>'
    )
  })

  it('não toca em h2..h6 nem no restante do HTML', () => {
    const html = '<h2>a</h2><h3>b</h3><p>texto com &lt;h1&gt; escapado</p>'
    expect(demoteContentH1(html)).toBe(html)
  })

  it('devolve string vazia sem alteração', () => {
    expect(demoteContentH1('')).toBe('')
  })
})
