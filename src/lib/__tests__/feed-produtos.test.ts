import { describe, it, expect } from 'vitest'
import { gerarFeed, COLUNAS } from '../feed-produtos'
import type { Vehicle } from '@/types'

function veiculo(sobrescreve: Partial<Vehicle> = {}): Vehicle {
  return {
    id: '779673',
    slug: 'porsche-panamera-2025-779673',
    brand: 'Porsche',
    model: 'Panamera',
    version: '4S 560cv',
    year_manufacture: 2024,
    year_model: 2025,
    color: 'Cinza',
    mileage: 12020,
    fuel_type: 'Gasolina e Elétrico',
    transmission: 'Automático',
    price: 1090000,
    category: 'sports',
    body_type: 'Sedã',
    doors: 4,
    location_id: '1',
    photos: ['https://cdn/1.jpg', 'https://cdn/2.jpg', 'https://cdn/3.jpg'],
    videos: null,
    options: null,
    description: 'Porsche Panamera 2025 com 12.020 km.',
    seo_title: null,
    seo_description: null,
    status: 'available',
    is_new: false,
    ...sobrescreve,
  } as Vehicle
}

function linhas(tsv: string) {
  const [cabecalho, ...resto] = tsv.trim().split('\n')
  const colunas = cabecalho.split('\t')
  return resto.map(l => {
    const celulas = l.split('\t')
    return Object.fromEntries(colunas.map((c, i) => [c, celulas[i]])) as Record<string, string>
  })
}

describe('feed de produtos (TSV)', () => {
  it('publica cabeçalho em minúsculas com underscore, como a especificação exige', () => {
    const { tsv } = gerarFeed([veiculo()])
    const cabecalho = tsv.split('\n')[0]
    expect(cabecalho).toBe(COLUNAS.join('\t'))
    expect(cabecalho).toBe(cabecalho.toLowerCase())
  })

  it('uma linha por veículo', () => {
    const feed = gerarFeed([veiculo({ id: '1' }), veiculo({ id: '2' })])
    expect(feed.linhas).toBe(2)
  })

  describe('campos obrigatórios', () => {
    const [linha] = linhas(gerarFeed([veiculo()]).tsv)

    it('item_id é o id numérico — o mesmo que a conversão manda em content_id', () => {
      expect(linha.item_id).toBe('779673')
      expect(JSON.parse(linha.ads_metadata).vehicle_id).toBe('779673')
    })

    it('url aponta para a ficha que existe, não para /estoque/{id}', () => {
      expect(linha.url).toBe('https://attraveiculos.com.br/veiculo/porsche-panamera-2025-779673')
    })

    it('preço leva a moeda ISO-4217', () => {
      expect(linha.price).toBe('1090000.00 BRL')
    })

    it('availability usa o vocabulário da especificação', () => {
      expect(linha.availability).toBe('in_stock')
    })

    it('país em ISO 3166-1 alfa-2', () => {
      expect(linha.target_countries).toBe('BR')
      expect(linha.store_country).toBe('BR')
    })
  })

  describe('elegibilidade', () => {
    const [linha] = linhas(gerarFeed([veiculo()]).tsv)

    it('busca e anúncio ligados, checkout desligado', () => {
      expect(linha.is_eligible_search).toBe('true')
      expect(linha.is_ads_eligible).toBe('true')
      // Checkout exigiria política de devolução, privacidade e termos, que não
      // existem publicadas — e não há carrinho no site.
      expect(linha.is_eligible_checkout).toBe('false')
    })

    it('declara que não há identificador em vez de inventar um', () => {
      expect(linha.identifier_exists).toBe('no')
      expect(COLUNAS).not.toContain('gtin')
      expect(COLUNAS).not.toContain('mpn')
    })
  })

  describe('recusa em vez de publicar linha incompleta', () => {
    it('sem marca', () => {
      const feed = gerarFeed([veiculo({ brand: '' })])
      expect(feed.linhas).toBe(0)
      expect(feed.recusados[0].campo).toBe('brand')
    })

    it('sem foto', () => {
      const feed = gerarFeed([veiculo({ photos: [] })])
      expect(feed.recusados[0].campo).toBe('image_url')
    })

    it('preço zerado', () => {
      const feed = gerarFeed([veiculo({ price: 0 })])
      expect(feed.recusados[0].campo).toBe('price')
    })

    it('um veículo ruim não derruba os bons', () => {
      const feed = gerarFeed([veiculo({ id: '1' }), veiculo({ id: '2', price: 0 }), veiculo({ id: '3' })])
      expect(feed.linhas).toBe(2)
      expect(feed.recusados).toHaveLength(1)
    })
  })

  describe('integridade do TSV', () => {
    it('tabulação e quebra de linha no dado não quebram o formato', () => {
      const { tsv } = gerarFeed([veiculo({ description: 'linha um\tcom tab\nlinha dois' })])
      const corpo = tsv.trim().split('\n')
      expect(corpo).toHaveLength(2)
      expect(corpo[1].split('\t')).toHaveLength(COLUNAS.length)
    })

    it('vírgula na descrição é inofensiva — por isso TSV e não CSV', () => {
      const [linha] = linhas(gerarFeed([veiculo({ description: 'Motor V8, câmbio automático, teto solar' })]).tsv)
      expect(linha.description).toBe('Motor V8, câmbio automático, teto solar')
    })

    it('fotos extras vão em additional_image_urls, separadas por vírgula', () => {
      const [linha] = linhas(gerarFeed([veiculo()]).tsv)
      expect(linha.image_url).toBe('https://cdn/1.jpg')
      expect(linha.additional_image_urls).toBe('https://cdn/2.jpg,https://cdn/3.jpg')
    })

    it('descarta foto que não seja https', () => {
      const [linha] = linhas(gerarFeed([veiculo({ photos: ['https://cdn/1.jpg', 'http://inseguro/2.jpg'] })]).tsv)
      expect(linha.additional_image_urls).toBe('')
    })
  })

  describe('limites de tamanho', () => {
    it('trunca e reporta, em vez de truncar calado', () => {
      const feed = gerarFeed([veiculo({ description: 'x'.repeat(5200) })])
      const [linha] = linhas(feed.tsv)
      expect(linha.description).toHaveLength(5000)
      expect(feed.truncados[0].campo).toBe('description')
    })

    it('título cabe no limite de 150', () => {
      const feed = gerarFeed([veiculo({ version: 'V'.repeat(200) })])
      const [linha] = linhas(feed.tsv)
      expect(linha.title.length).toBeLessThanOrEqual(150)
    })
  })

  it('veículo zero km sai como new', () => {
    const [linha] = linhas(gerarFeed([veiculo({ is_new: true })]).tsv)
    expect(linha.condition).toBe('new')
  })

  it('reservado continua vendável', () => {
    const [linha] = linhas(gerarFeed([veiculo({ status: 'reserved' })]).tsv)
    expect(linha.availability).toBe('in_stock')
  })
})
