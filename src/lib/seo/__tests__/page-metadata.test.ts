import { describe, it, expect } from 'vitest'
import { pageTitle, canonicalUrl, listingRobots, listingCanonical, encurtar, descricaoSeo } from '../page-metadata'

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

  it('com a marca no meio, sai absoluto para o template não repetir a marca', () => {
    expect(pageTitle('Sobre a Attra Veículos | Loja em Uberlândia')).toEqual({
      absolute: 'Sobre a Attra Veículos | Loja em Uberlândia',
    })
    expect(pageTitle('Porsche 718 Boxster GTS 2024: zero km na Attra Veículos')).toEqual({
      absolute: 'Porsche 718 Boxster GTS 2024: zero km na Attra Veículos',
    })
  })

  it('tira o sufixo de seção (Manual Attra, Blog Attra), seguido ou não da marca', () => {
    expect(pageTitle('PTS Paint to Sample | Manual Attra')).toBe('PTS Paint to Sample')
    expect(pageTitle('BMW M2 2025: a nova geração | Blog Attra | Attra Veículos')).toBe(
      'BMW M2 2025: a nova geração'
    )
  })

  it('não devolve título vazio quando o dado era só a marca', () => {
    expect(pageTitle('Attra Veículos')).toEqual({ absolute: 'Attra Veículos' })
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

describe('listingCanonical', () => {
  const destinos = { marca: (m: string) => (m === 'porsche' ? '/comprar/porsche' : `/veiculos?marca=${m}`) }

  it('listagem limpa aponta para si mesma', () => {
    expect(listingCanonical('/veiculos', {}, destinos)).toBe('https://attraveiculos.com.br/veiculos')
  })

  it('cada página da paginação aponta para si mesma, não para a 1ª', () => {
    expect(listingCanonical('/veiculos', { pagina: '3' }, destinos)).toBe('https://attraveiculos.com.br/veiculos?pagina=3')
    expect(listingCanonical('/veiculos', { pagina: '1' }, destinos)).toBe('https://attraveiculos.com.br/veiculos')
  })

  it('filtro de marca vai para o destino da marca', () => {
    expect(listingCanonical('/veiculos', { marca: 'porsche' }, destinos)).toBe('https://attraveiculos.com.br/comprar/porsche')
    expect(listingCanonical('/veiculos', { marca: 'ram' }, destinos)).toBe('https://attraveiculos.com.br/veiculos?marca=ram')
  })

  it('combinação de filtros volta para a listagem limpa', () => {
    expect(listingCanonical('/veiculos', { marca: 'porsche', pagina: '2' }, destinos)).toBe('https://attraveiculos.com.br/veiculos')
    expect(listingCanonical('/veiculos', { ordenar: 'preco-asc' }, destinos)).toBe('https://attraveiculos.com.br/veiculos')
  })

  it('pagina que não é número não vira canonical', () => {
    expect(listingCanonical('/veiculos', { pagina: 'abc' }, destinos)).toBe('https://attraveiculos.com.br/veiculos')
  })
})

describe('pageTitle: limite de 60 caracteres', () => {
  const tamanho = (t: string | { absolute: string }) =>
    typeof t === 'string' ? t.length + ' | Attra Veículos'.length : t.absolute.length

  it('tira os trechos depois de " | " até caber com o sufixo do template', () => {
    expect(pageTitle('Comprar Porsche no Brasil | Porsche Seminovo e 0 km | Attra Veículos')).toBe(
      'Comprar Porsche no Brasil'
    )
    expect(pageTitle('Audi R8 2018 Branco | Performance e Exclusividade na Attra Veículos')).toBe(
      'Audi R8 2018 Branco'
    )
  })

  it('usa o sufixo curto quando o longo não cabe', () => {
    expect(pageTitle('Mercedes-AMG G-63 vs CLA-35: Comparativo Premium | Attra Veículos')).toEqual({
      absolute: 'Mercedes-AMG G-63 vs CLA-35: Comparativo Premium | Attra',
    })
  })

  it('corta em palavra inteira, sem conectivo no fim, quando nem o título sozinho cabe', () => {
    const t = pageTitle('Quanto custa manter um Porsche 911 no Brasil: seguro, revisão e pneus de verdade')
    expect(t).toEqual({ absolute: 'Quanto custa manter um Porsche 911 no Brasil: seguro' })
    expect(tamanho(t)).toBeLessThanOrEqual(60)
  })

  it('não corta "Classe A" achando que o A é conectivo', () => {
    expect(encurtar('Mercedes-Benz Classe A', 30)).toBe('Mercedes-Benz Classe A')
    expect(encurtar('Mercedes-Benz Classe A 200 Progressive', 24)).toBe('Mercedes-Benz Classe A')
  })
})

describe('descricaoSeo', () => {
  it('mantém a descrição que já cabe', () => {
    const d = 'Carros de luxo de R$ 400 mil a R$ 600 mil. SUVs premium, sedans esportivos e modelos seminovos com procedência. Attra Veículos.'
    expect(descricaoSeo(d)).toBe(d)
  })

  it('corta no fim de frase quando sobra pelo menos o mínimo', () => {
    const d = 'Primeira frase com informação suficiente para ocupar bastante espaço na descrição da página do site, com modelo, ano e quilometragem do site. Segunda frase que passa bem do limite de cento e cinquenta e cinco.'
    const r = descricaoSeo(d)
    expect(r.endsWith('site.')).toBe(true)
    expect(r.length).toBeLessThanOrEqual(155)
  })

  it('corta em palavra, com reticências, quando não há frase que caiba', () => {
    const r = descricaoSeo('Uma frase única e comprida '.repeat(8))
    expect(r.length).toBeLessThanOrEqual(155)
    expect(r.endsWith('…')).toBe(true)
  })

  it('completa a descrição curta com a frase da página', () => {
    const r = descricaoSeo('Descubra como funciona o programa Ad Personam da Lamborghini.', 'Verbete do Manual Attra com o que muda no valor de revenda e como conferir no carro.')
    expect(r.length).toBeGreaterThanOrEqual(120)
    expect(r.length).toBeLessThanOrEqual(155)
  })
})
