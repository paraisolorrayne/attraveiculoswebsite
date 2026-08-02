import { describe, it, expect } from 'vitest'
import { pageTitle, canonicalUrl, listingRobots } from '../page-metadata'

describe('pageTitle', () => {
  it('remove o sufixo de marca que o template do layout raiz reaplica', () => {
    expect(pageTitle('Porsche 911 2026 | Attra Veículos')).toBe('Porsche 911 2026')
  })

  it('remove o sufixo repetido', () => {
    expect(pageTitle('Porsche 911 2026 | Attra Veículos | Attra Veículos')).toBe(
      'Porsche 911 2026'
    )
  })

  it('aceita travessão e hífen como separador, e a marca sem acento', () => {
    expect(pageTitle('Nossa História — Attra Veículos')).toBe('Nossa História')
    expect(pageTitle('Guia de compra - Attra Veiculos')).toBe('Guia de compra')
  })

  it('preserva a marca quando ela não está no fim do título', () => {
    expect(pageTitle('Sobre a Attra Veículos | Loja em Uberlândia')).toBe(
      'Sobre a Attra Veículos | Loja em Uberlândia'
    )
  })

  it('preserva sufixo de outra seção editorial', () => {
    expect(pageTitle('PTS Paint to Sample | Manual Attra')).toBe(
      'PTS Paint to Sample | Manual Attra'
    )
  })

  it('não devolve título vazio quando o dado era só a marca', () => {
    expect(pageTitle('Attra Veículos')).toBe('Attra Veículos')
  })
})

describe('canonicalUrl', () => {
  it('monta URL absoluta a partir do caminho', () => {
    expect(canonicalUrl('/veiculos')).toBe('https://attraveiculos.com.br/veiculos')
  })

  it('trata a home', () => {
    expect(canonicalUrl('/')).toBe('https://attraveiculos.com.br/')
  })
})

describe('listingRobots', () => {
  const INDEXAVEIS = ['marca']

  it('mantém a listagem limpa indexável', () => {
    expect(listingRobots({}, INDEXAVEIS)).toEqual({ index: true, follow: true })
  })

  it('mantém indexável o filtro único da whitelist', () => {
    expect(listingRobots({ marca: 'porsche' }, INDEXAVEIS)).toEqual({
      index: true,
      follow: true,
    })
  })

  it('tira do índice a combinação de dois filtros', () => {
    expect(listingRobots({ marca: 'porsche', ano: '2024' }, INDEXAVEIS)).toEqual({
      index: false,
      follow: true,
    })
  })

  it('tira do índice qualquer filtro fora da whitelist, mesmo sozinho', () => {
    expect(listingRobots({ ordenar: 'preco-desc' }, INDEXAVEIS)).toEqual({
      index: false,
      follow: true,
    })
  })

  it('ignora parâmetro vazio', () => {
    expect(listingRobots({ marca: 'porsche', q: '' }, INDEXAVEIS)).toEqual({
      index: true,
      follow: true,
    })
  })

  it('não trata pagina=1 como filtro', () => {
    expect(listingRobots({ marca: 'porsche', pagina: '1' }, INDEXAVEIS)).toEqual({
      index: true,
      follow: true,
    })
    expect(listingRobots({ pagina: '2' }, INDEXAVEIS)).toEqual({
      index: false,
      follow: true,
    })
  })
})
