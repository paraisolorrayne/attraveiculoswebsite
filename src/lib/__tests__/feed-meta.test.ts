import { describe, it, expect } from 'vitest'
import { gerarFeedMeta, COLUNAS_META } from '../feed-meta'
import type { Vehicle } from '@/types'

function veiculo(sobrescreve: Partial<Vehicle> = {}): Vehicle {
  return {
    id: '779673', slug: 'porsche-panamera-2025-779673', brand: 'Porsche', model: 'Panamera',
    version: '4S 560cv', year_manufacture: 2024, year_model: 2025, color: 'Cinza',
    mileage: 12020, fuel_type: 'Gasolina e Elétrico', transmission: 'Automático',
    price: 1_090_000, category: 'sports', body_type: 'Sedã', doors: 4, location_id: '1',
    photos: ['https://cdn/1.jpg', 'https://cdn/2.jpg'], videos: null, options: null,
    description: 'Porsche Panamera 2025 com 12.020 km.', seo_title: null, seo_description: null,
    status: 'available', is_new: false,
    ...sobrescreve,
  } as Vehicle
}

function primeira(csv: string): Record<string, string> {
  const [cab, linha] = csv.trim().split('\n')
  // Divisão respeitando aspas, só para o teste.
  const celulas: string[] = []
  let atual = ''
  let dentro = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (dentro) {
      if (c === '"' && linha[i + 1] === '"') { atual += '"'; i++ }
      else if (c === '"') dentro = false
      else atual += c
    } else if (c === '"') dentro = true
    else if (c === ',') { celulas.push(atual); atual = '' }
    else atual += c
  }
  celulas.push(atual)
  return Object.fromEntries(cab.split(',').map((c, i) => [c, celulas[i]]))
}

describe('feed do Meta', () => {
  it('usa o vocabulário do Meta, não o do OpenAI', () => {
    expect(COLUNAS_META).toContain('vehicle_id')
    expect(COLUNAS_META).toContain('make')
    expect(COLUNAS_META).toContain('state_of_vehicle')
    expect(COLUNAS_META).not.toContain('item_id')
    expect(COLUNAS_META).not.toContain('brand')
    expect(COLUNAS_META).not.toContain('condition')
  })

  describe('campos obrigatórios', () => {
    const l = primeira(gerarFeedMeta([veiculo()]).csv)

    it('marca, modelo e ano são colunas próprias', () => {
      expect(l.make).toBe('Porsche')
      expect(l.model).toBe('Panamera')
      expect(l.year).toBe('2025')
    })

    it('title começa pelo ano, como o Meta pede', () => {
      expect(l.title).toBe('2025 Porsche Panamera 4S 560cv')
    })

    it('quilometragem separa valor e unidade', () => {
      expect(l['mileage.value']).toBe('12020')
      expect(l['mileage.unit']).toBe('KM')
    })

    it('preço com código ISO separado por espaço', () => {
      expect(l.price).toBe('1090000.00 BRL')
    })

    it('state_of_vehicle na caixa exata do enum', () => {
      expect(l.state_of_vehicle).toBe('Used')
      expect(primeira(gerarFeedMeta([veiculo({ is_new: true })]).csv).state_of_vehicle).toBe('New')
    })

    it('endereço e coordenadas da loja em toda linha', () => {
      expect(l['address.city']).toBe('Uberlândia')
      expect(l['address.region']).toBe('MG')
      expect(l['address.postal_code']).toBe('38408-343')
      expect(Number(l.latitude)).toBeCloseTo(-18.9293967)
      expect(Number(l.longitude)).toBeCloseTo(-48.2765108)
    })
  })

  describe('body_style: enum fechado', () => {
    const caso = (v: Partial<Vehicle>) => primeira(gerarFeedMeta([veiculo(v)]).csv).body_style

    it('traduz cada carroceria', () => {
      expect(caso({ body_type: 'Sedã' })).toBe('SEDAN')
      expect(caso({ body_type: 'Hatch' })).toBe('HATCHBACK')
      expect(caso({ body_type: 'Picapes' })).toBe('TRUCK')
      expect(caso({ body_type: 'Wagon/Perua' })).toBe('WAGON')
      expect(caso({ body_type: 'SUV / Utilitário Esportivo' })).toBe('SUV')
    })

    it('o SUV de teto caído entra como SUV, não como COUPE', () => {
      expect(caso({ body_type: 'Conversível/Cupê', model: 'X6', doors: 4 })).toBe('SUV')
    })

    it('cupê de 2 portas entra como COUPE', () => {
      expect(caso({ body_type: 'Conversível/Cupê', model: '911', version: 'Turbo S Coupe', doors: 2 })).toBe('COUPE')
    })

    it('carroceria desconhecida vira OTHER em vez de derrubar a linha', () => {
      expect(caso({ body_type: 'Buggy' })).toBe('OTHER')
    })
  })

  describe('fuel_type: enum fechado', () => {
    const caso = (f: string) => primeira(gerarFeedMeta([veiculo({ fuel_type: f })]).csv).fuel_type

    it('"Gasolina e Elétrico" é HYBRID, não GASOLINE', () => {
      expect(caso('Gasolina e Elétrico')).toBe('HYBRID')
    })

    it('demais valores', () => {
      expect(caso('Gasolina')).toBe('GASOLINE')
      expect(caso('Diesel')).toBe('DIESEL')
      expect(caso('Elétrico')).toBe('ELECTRIC')
      expect(caso('Flex')).toBe('FLEX')
    })

    it('valor irreconhecível fica vazio — é campo opcional, não vale chutar', () => {
      expect(caso('Querosene')).toBe('')
    })
  })

  describe('CSV', () => {
    it('vírgula na descrição não desalinha as colunas', () => {
      const { csv } = gerarFeedMeta([veiculo({ description: 'Motor V8, câmbio automático, teto solar' })])
      const l = primeira(csv)
      expect(l.description).toBe('Motor V8, câmbio automático, teto solar')
      expect(l.make).toBe('Porsche')
    })

    it('aspas na descrição são escapadas', () => {
      const l = primeira(gerarFeedMeta([veiculo({ description: 'Pacote "Sport Chrono" completo' })]).csv)
      expect(l.description).toBe('Pacote "Sport Chrono" completo')
    })

    it('fotos vão em colunas numeradas', () => {
      const l = primeira(gerarFeedMeta([veiculo()]).csv)
      expect(l['image[0].url']).toBe('https://cdn/1.jpg')
      expect(l['image[1].url']).toBe('https://cdn/2.jpg')
      expect(l['image[2].url']).toBe('')
    })
  })

  describe('recusa', () => {
    it('sem cor — obrigatório no Meta e não no OpenAI', () => {
      const feed = gerarFeedMeta([veiculo({ color: '' })])
      expect(feed.linhas).toBe(0)
      expect(feed.recusados[0].campo).toBe('exterior_color')
    })

    it('sem foto', () => {
      expect(gerarFeedMeta([veiculo({ photos: [] })]).recusados[0].campo).toBe('image[0].url')
    })

    it('um ruim não derruba os bons', () => {
      const feed = gerarFeedMeta([veiculo({ id: '1' }), veiculo({ id: '2', color: '' }), veiculo({ id: '3' })])
      expect(feed.linhas).toBe(2)
      expect(feed.recusados).toHaveLength(1)
    })
  })

  it('veículo vendido sai como not_available', () => {
    expect(primeira(gerarFeedMeta([veiculo({ status: 'sold' })]).csv).availability).toBe('not_available')
  })
})
