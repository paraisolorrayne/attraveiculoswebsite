import { describe, it, expect } from 'vitest'
import { modelosDoEstoque, acharModeloDoEstoque, modeloCasa, veiculosDoModelo } from '../modelos-do-estoque'
import type { Vehicle } from '@/types'

function veiculo(sobrescreve: Partial<Vehicle> = {}): Vehicle {
  return {
    id: '1', slug: 'x', brand: 'Mercedes', model: 'GLC', version: '220D TB 4M Off-Road',
    year_manufacture: 2022, year_model: 2022, color: 'Cinza', mileage: 39950,
    fuel_type: 'Diesel', transmission: 'Automático', price: 249_000,
    category: 'premium', body_type: 'SUV', doors: 4, location_id: '1',
    photos: ['https://cdn/1.jpg'], videos: null, options: null,
    description: 'd', seo_title: null, seo_description: null,
    status: 'available', is_new: false,
    ...sobrescreve,
  } as Vehicle
}

describe('modelos derivados do estoque', () => {
  it('gera página para o GLC — o caso que motivou tudo', () => {
    const [m] = modelosDoEstoque([veiculo()])
    expect(m.brandSlug).toBe('mercedes-benz')
    expect(m.modelSlug).toBe('glc')
    expect(m.model.fullName).toBe('Mercedes GLC')
  })

  it('casa "Mercedes" do estoque com o slug "mercedes-benz" da página', () => {
    // A divergência é real: o AutoConf devolve "Mercedes", a página é
    // /comprar/mercedes-benz.
    const m = acharModeloDoEstoque([veiculo()], 'mercedes-benz', 'glc')
    expect(m).toBeDefined()
  })

  it('não sobrepõe modelo que já tem página curada', () => {
    // G-63 é coberto pela página curada "g63-amg", mesmo com slug diferente.
    expect(modelosDoEstoque([veiculo({ model: 'G-63' })])).toHaveLength(0)
    // "GT" é coberto pela curada "amg-gt" — sem isso geraríamos /gt duplicado.
    expect(modelosDoEstoque([veiculo({ model: 'GT' })])).toHaveLength(0)
  })

  it('GLE não é curado em seo-brands, então ganha página derivada', () => {
    const [m] = modelosDoEstoque([veiculo({ model: 'GLE', version: '63s AMG' })])
    expect(m.modelSlug).toBe('gle')
  })

  it('ignora marca que não tem página de SEO', () => {
    expect(modelosDoEstoque([veiculo({ brand: 'Pontiac', model: 'Solstice' })])).toHaveLength(0)
  })

  it('ignora veículo sem marca ou sem modelo', () => {
    expect(modelosDoEstoque([veiculo({ brand: '' }), veiculo({ model: '' })])).toHaveLength(0)
  })

  describe('texto sai do estoque, nunca de especificação inventada', () => {
    const tres = [
      veiculo({ id: '1', brand: 'Audi', model: 'Q5', version: 'Performance Black', price: 279_000, year_model: 2023 }),
      veiculo({ id: '2', brand: 'Audi', model: 'Q5', version: 'Advanced', price: 399_000, year_model: 2025 }),
      veiculo({ id: '3', brand: 'Audi', model: 'Q5', version: 'Prestige', price: 199_000, year_model: 2022 }),
    ]

    it('conta as unidades e abre a faixa de preço', () => {
      const [m] = modelosDoEstoque(tres)
      expect(m.unidades).toBe(3)
      expect(m.model.description).toContain('3 unidades')
      expect(m.model.description).toContain('R$ 199.000')
      expect(m.model.description).toContain('R$ 399.000')
      expect(m.model.description).toContain('entre 2022 e 2025')
    })

    it('lista as versões reais nos destaques', () => {
      const [m] = modelosDoEstoque(tres)
      expect(m.model.highlights.join(' ')).toContain('Prestige')
    })

    it('unidade única não vira "de X a X"', () => {
      const [m] = modelosDoEstoque([veiculo()])
      expect(m.model.description).toContain('1 unidade')
      expect(m.model.description).toContain('por R$ 249.000')
      expect(m.model.description).toContain('ano 2022')
      expect(m.model.description).not.toContain(' a R$ 249.000')
    })

    it('cita a cidade — é metade da pergunta que falhou', () => {
      const [m] = modelosDoEstoque([veiculo()])
      expect(m.model.description).toContain('Uberlândia')
      expect(m.model.metaTitle).toContain('Uberlândia')
    })

    it('diz que aceita troca — a outra metade da pergunta', () => {
      const [m] = modelosDoEstoque([veiculo()])
      expect(m.model.description.toLowerCase()).toContain('troca')
      expect(m.model.metaDescription.toLowerCase()).toContain('troca')
    })
  })

  it('categoria vem da carroceria classificada', () => {
    expect(modelosDoEstoque([veiculo()])[0].model.category).toBe('suv')
    const sedan = veiculo({ brand: 'Audi', model: 'A5', body_type: 'Sedã' })
    expect(modelosDoEstoque([sedan])[0].model.category).toBe('sedan')
  })

  it('ordena por quantidade — o modelo com mais estoque primeiro', () => {
    const lista = [
      veiculo({ id: '1', brand: 'Audi', model: 'Q5' }),
      veiculo({ id: '2', brand: 'Audi', model: 'Q5' }),
      veiculo({ id: '3', brand: 'Audi', model: 'A5', body_type: 'Sedã' }),
    ]
    const modelos = modelosDoEstoque(lista)
    expect(modelos[0].modelSlug).toBe('q5')
    expect(modelos[0].unidades).toBe(2)
  })

  describe('casamento entre o nome da página e o do estoque', () => {
    it('"G 63 AMG" da página casa com "G-63" do estoque — eram 4 carros invisíveis', () => {
      expect(modeloCasa('G 63 AMG', 'G-63')).toBe(true)
    })

    it('"AMG GT" casa com "GT" — o E Performance dizia "nenhum disponível"', () => {
      expect(modeloCasa('AMG GT', 'GT')).toBe(true)
    })

    it('não confunde modelos vizinhos', () => {
      expect(modeloCasa('X5', 'X6')).toBe(false)
      expect(modeloCasa('Q7', 'Q5')).toBe(false)
    })

    it('nome de uma letra não vira curinga', () => {
      expect(modeloCasa('A', 'A5')).toBe(false)
    })

    it('filtra marca e modelo juntos, tolerando Mercedes x Mercedes-Benz', () => {
      const estoque = [
        { brand: 'Mercedes', model: 'G-63' },
        { brand: 'Mercedes', model: 'GLC' },
        { brand: 'BMW', model: 'X6' },
      ]
      const achados = veiculosDoModelo(estoque, 'Mercedes-Benz', 'G 63 AMG')
      expect(achados).toEqual([{ brand: 'Mercedes', model: 'G-63' }])
    })
  })
})
