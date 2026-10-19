import { describe, it, expect } from 'vitest'
import { gerarFeedMetaWhatsApp, COLUNAS_WHATSAPP } from '../feed-meta-whatsapp'
import type { Vehicle } from '@/types'

function veiculo(sobrescreve: Partial<Vehicle> = {}): Vehicle {
  return {
    id: '779673', slug: 'porsche-panamera-2025-779673', brand: 'Porsche', model: 'Panamera',
    version: '4S 560cv', year_manufacture: 2024, year_model: 2025, color: 'Cinza',
    mileage: 12020, fuel_type: 'Gasolina e Elétrico', transmission: 'Automático',
    price: 1_090_000, category: 'sports', body_type: 'Sedã', doors: 4, location_id: '1',
    photos: ['https://cdn/1.jpg', 'https://cdn/2.jpg'], videos: null,
    options: ['Teto solar', 'Freios ABS'],
    description: 'Porsche Panamera 2025 com 12.020 km.', seo_title: null, seo_description: null,
    status: 'available', is_new: false,
    ...sobrescreve,
  } as Vehicle
}

/** Divide o CSV em registros e células respeitando aspas — só para o teste. */
function registros(csv: string): string[][] {
  const linhas: string[][] = []
  let linha: string[] = []
  let atual = ''
  let dentro = false
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]
    if (dentro) {
      if (c === '"' && csv[i + 1] === '"') { atual += '"'; i++ }
      else if (c === '"') dentro = false
      else atual += c
    } else if (c === '"') dentro = true
    else if (c === ',') { linha.push(atual); atual = '' }
    else if (c === '\n') { linha.push(atual); linhas.push(linha); linha = []; atual = '' }
    else atual += c
  }
  return linhas
}

function primeira(csv: string): Record<string, string> {
  const [cab, linha] = registros(csv)
  return Object.fromEntries(cab.map((c, i) => [c, linha[i]]))
}

describe('feed do Meta para o WhatsApp', () => {
  it('colunas do catálogo de produto, na ordem pedida', () => {
    expect(COLUNAS_WHATSAPP).toEqual([
      'id', 'title', 'description', 'availability', 'condition', 'price',
      'link', 'image_link', 'additional_image_link', 'brand',
    ])
    expect(gerarFeedMetaWhatsApp([]).csv).toBe(COLUNAS_WHATSAPP.join(',') + '\n')
  })

  describe('campos', () => {
    const l = primeira(gerarFeedMetaWhatsApp([veiculo()]).csv)

    it('id é o mesmo vehicle_id do catálogo de veículos', () => {
      expect(l.id).toBe('779673')
    })

    it('title é marca, modelo, versão e ano, nessa ordem', () => {
      expect(l.title).toBe('Porsche Panamera 4S 560cv 2025')
    })

    it('availability fixo em "in stock"', () => {
      expect(l.availability).toBe('in stock')
    })

    it('condition minúsculo: used para seminovo, new para 0 km', () => {
      expect(l.condition).toBe('used')
      expect(primeira(gerarFeedMetaWhatsApp([veiculo({ is_new: true })]).csv).condition).toBe('new')
    })

    it('preço com ponto decimal, espaço e BRL', () => {
      expect(l.price).toBe('1090000.00 BRL')
    })

    it('link é a página pública do carro', () => {
      expect(l.link).toBe('https://attraveiculos.com.br/veiculo/porsche-panamera-2025-779673')
    })

    it('primeira foto em image_link, as outras em additional_image_link', () => {
      expect(l.image_link).toBe('https://cdn/1.jpg')
      expect(l.additional_image_link).toBe('https://cdn/2.jpg')
    })

    it('brand é a marca', () => {
      expect(l.brand).toBe('Porsche')
    })
  })

  describe('title', () => {
    const titulo = (v: Partial<Vehicle>) => primeira(gerarFeedMetaWhatsApp([veiculo(v)]).csv).title

    it('não repete o modelo quando a versão já começa por ele', () => {
      expect(titulo({ brand: 'Land Rover', model: 'Range Rover', version: 'Range R. VELAR SV', year_model: 2020 }))
        .toBe('Land Rover Range Rover VELAR SV 2020')
    })

    it('não repete o fim do modelo que a versão repete no começo', () => {
      expect(titulo({ brand: 'GMC', model: 'Sierra 3500 Denali', version: 'Denali Ultimate Dually', year_model: 2024 }))
        .toBe('GMC Sierra 3500 Denali Ultimate Dually 2024')
    })

    it('expande a abreviação do AutoConf', () => {
      expect(titulo({ brand: 'Mercedes', model: 'G-63', version: 'AMG 4MATIC V8 Bi-TB 585cv Aut.', year_model: 2021 }))
        .toBe('Mercedes G-63 AMG 4MATIC V8 Bi-Turbo 585cv Automático 2021')
    })

    it('sem versão, fica marca, modelo e ano', () => {
      expect(titulo({ version: null })).toBe('Porsche Panamera 2025')
    })

    it('no máximo 150 caracteres', () => {
      expect(titulo({ version: 'X'.repeat(300) }).length).toBeLessThanOrEqual(150)
    })
  })

  describe('description', () => {
    const descricao = (v: Partial<Vehicle> = {}) => primeira(gerarFeedMetaWhatsApp([veiculo(v)]).csv).description

    it('texto corrido com versão, ano/modelo, km, câmbio, combustível, cor e opcionais', () => {
      expect(descricao()).toBe(
        'Porsche Panamera 4S 560cv, ano/modelo 2024/2025, 12.020 km rodados. '
        + 'Câmbio Automático, combustível Gasolina e Elétrico, cor Cinza. '
        + 'Opcionais: Teto solar, Freios ABS.',
      )
    })

    it('0 km diz 0 km, não "0 km rodados"', () => {
      expect(descricao({ is_new: true, mileage: 0 })).toContain('ano/modelo 2024/2025, 0 km.')
    })

    it('sem opcionais, sem a frase de opcionais', () => {
      expect(descricao({ options: null })).not.toContain('Opcionais')
    })

    it('sem HTML', () => {
      const d = descricao({ options: ['<b>Teto solar</b>', 'Som <br/>Burmester'] })
      expect(d).toContain('Opcionais: Teto solar, Som Burmester.')
      expect(d).not.toMatch(/[<>]/)
    })

    it('no máximo 5000 caracteres', () => {
      const opcionais = Array.from({ length: 1000 }, (_, i) => `Opcional número ${i}`)
      expect(descricao({ options: opcionais }).length).toBeLessThanOrEqual(5000)
    })
  })

  describe('fotos', () => {
    it('no máximo 10 fotos adicionais, separadas por vírgula numa célula só', () => {
      const fotos = Array.from({ length: 20 }, (_, i) => `https://cdn/${i}.jpg`)
      const l = primeira(gerarFeedMetaWhatsApp([veiculo({ photos: fotos })]).csv)
      expect(l.image_link).toBe('https://cdn/0.jpg')
      expect(l.additional_image_link.split(',')).toEqual(fotos.slice(1, 11))
      expect(l.brand).toBe('Porsche')
    })

    it('a célula de fotos adicionais sai entre aspas', () => {
      const { csv } = gerarFeedMetaWhatsApp([veiculo({ photos: ['https://cdn/0.jpg', 'https://cdn/1.jpg', 'https://cdn/2.jpg'] })])
      expect(csv).toContain(',"https://cdn/1.jpg,https://cdn/2.jpg",')
    })

    it('foto sem https é ignorada', () => {
      const l = primeira(gerarFeedMetaWhatsApp([veiculo({ photos: ['http://cdn/0.jpg', 'https://cdn/1.jpg'] })]).csv)
      expect(l.image_link).toBe('https://cdn/1.jpg')
      expect(l.additional_image_link).toBe('')
    })
  })

  describe('CSV', () => {
    it('vírgula e aspas não desalinham as colunas', () => {
      const l = primeira(gerarFeedMetaWhatsApp([veiculo({ version: 'Pacote "Sport Chrono", teto' })]).csv)
      expect(l.title).toBe('Porsche Panamera Pacote "Sport Chrono", teto 2025')
      expect(l.brand).toBe('Porsche')
    })

    it('quebra de linha na origem não cria registro novo', () => {
      const feed = gerarFeedMetaWhatsApp([veiculo({ options: ['Teto\nsolar'], color: 'Cinza\r\nNardo' })])
      const linhas = registros(feed.csv)
      expect(linhas).toHaveLength(2)
      expect(linhas[1]).toHaveLength(COLUNAS_WHATSAPP.length)
    })
  })

  describe('fora do feed', () => {
    it('sem preço', () => {
      for (const price of [0, Number.NaN]) {
        const feed = gerarFeedMetaWhatsApp([veiculo({ price })])
        expect(feed.linhas).toBe(0)
        expect(feed.recusados[0].campo).toBe('price')
      }
    })

    it('sem foto', () => {
      for (const photos of [[], ['http://cdn/0.jpg']]) {
        const feed = gerarFeedMetaWhatsApp([veiculo({ photos })])
        expect(feed.linhas).toBe(0)
        expect(feed.recusados[0].campo).toBe('image_link')
      }
    })

    it('vendido e reservado', () => {
      const feed = gerarFeedMetaWhatsApp([veiculo({ status: 'sold' }), veiculo({ status: 'reserved' })])
      expect(feed.linhas).toBe(0)
      expect(feed.recusados.map(r => r.campo)).toEqual(['availability', 'availability'])
    })

    it('destaque é carro à venda e entra', () => {
      expect(gerarFeedMetaWhatsApp([veiculo({ status: 'highlight' })]).linhas).toBe(1)
    })

    it('um ruim não derruba os bons', () => {
      const feed = gerarFeedMetaWhatsApp([veiculo({ id: '1' }), veiculo({ id: '2', price: 0 }), veiculo({ id: '3' })])
      expect(feed.linhas).toBe(2)
      expect(feed.recusados).toEqual([{ id: '2', campo: 'price', motivo: 'preço inválido: 0' }])
    })
  })
})
