import { describe, it, expect } from 'vitest'
import { perguntasDoVeiculo } from '../faq-do-veiculo'
import type { FichaDoAnuncio } from '../ficha-do-anuncio'
import type { Vehicle } from '@/types'

const FICHA_VAZIA: FichaDoAnuncio = {
  motor: null, potencia: null, torque: null, cambio: null, tracao: null,
  aceleracao_0_100: null, velocidade_maxima: null, cor: null, interior: null,
  som: null, rodas: null, freios: null, diferenciais: [], opcionais: [],
}

function veiculo(extra: Partial<Vehicle> = {}): Vehicle {
  return {
    id: '1142317', slug: 'mercedes-s-63-2025-1142317', brand: 'Mercedes', model: 'S-63',
    version: 'AMG S E Performance Aut.', year_manufacture: 2025, year_model: 2025,
    color: 'Prata', mileage: 1920, fuel_type: 'Gasolina e Elétrico', transmission: 'Automático',
    price: 1_690_000, horsepower: null, torque: 900, status: 'available', is_new: false,
    ...extra,
  } as Vehicle
}

// A ficha do S 63 como o marketing preencheu em 22/10/2026.
const S63 = veiculo({
  ficha: {
    ...FICHA_VAZIA,
    motor: '4.0 V8 Biturbo Híbrido', potencia: '802 cv', torque: '145,8 kgfm',
    cor: 'Prata High-Tech Metálico', interior: 'Preto', som: 'Burmester',
    diferenciais: ['Blindado BSS com vidros Graphene Full Steel', 'Acabamentos em fibra de carbono'],
    opcionais: ['Travesseiros nos encostos de cabeça'],
  },
})

const resposta = (faqs: ReturnType<typeof perguntasDoVeiculo>, inicio: string) =>
  faqs.find(f => f.question.startsWith(inicio))?.answer

describe('FAQ da ficha com o molde da AutoConf', () => {
  const faqs = perguntasDoVeiculo(S63)

  it('as especificações usam motor, potência e torque da ficha', () => {
    expect(resposta(faqs, 'Quais as especificações')).toBe(
      'O Mercedes S-63 AMG S E Performance Automático 2025 tem motor 4.0 V8 Biturbo Híbrido de 802 cv e 145,8 kgfm de torque, câmbio automático e combustível gasolina e elétrico.',
    )
  })

  it('a cor é a da ficha, com o acabamento, numa pergunta própria', () => {
    expect(resposta(faqs, 'Qual a cor e o acabamento')).toBe(
      'Este Mercedes S-63 AMG S E Performance Automático vem na cor Prata High-Tech Metálico, com interior preto e som Burmester.',
    )
    expect(resposta(faqs, 'Quais as especificações')).not.toMatch(/cor|Nm/)
  })

  it('lista os diferenciais e os opcionais do molde', () => {
    expect(resposta(faqs, 'Quais os diferenciais')).toBe(
      'Diferenciais deste exemplar: blindado BSS com vidros Graphene Full Steel e acabamentos em fibra de carbono. Traz ainda travesseiros nos encostos de cabeça.',
    )
  })

  it('sem 0-100 nem velocidade no molde (carro blindado), não há pergunta de desempenho', () => {
    expect(faqs.some(f => /0 a 100|velocidade máxima/.test(f.question))).toBe(false)
  })

  it('a garantia não sai da ficha', () => {
    expect(resposta(faqs, 'O Mercedes S-63 AMG S E Performance Automático possui garantia')).toMatch(/informadas pelo consultor/)
  })
})

describe('FAQ da ficha sem molde', () => {
  const faqs = perguntasDoVeiculo(veiculo())

  it('fica com o cadastro, com a cor nas especificações', () => {
    expect(resposta(faqs, 'Quais as especificações')).toBe(
      'O Mercedes S-63 AMG S E Performance Automático 2025 tem 900 Nm de torque, câmbio automático, combustível gasolina e elétrico e cor prata.',
    )
  })

  it('não cria perguntas de cor, desempenho nem diferenciais', () => {
    expect(faqs.map(f => f.question).join(' | ')).not.toMatch(/acabamento|0 a 100|velocidade|diferenciais/)
  })
})

describe('desempenho do molde', () => {
  it('junta 0-100 e velocidade máxima quando os dois vêm', () => {
    const faqs = perguntasDoVeiculo(veiculo({
      ficha: { ...FICHA_VAZIA, aceleracao_0_100: '2,9 s', velocidade_maxima: '330 km/h' },
    }))
    expect(resposta(faqs, 'Quanto o')).toBe(
      'O Mercedes S-63 AMG S E Performance Automático acelera de 0 a 100 km/h em 2,9 s e chega a 330 km/h.',
    )
  })
})
