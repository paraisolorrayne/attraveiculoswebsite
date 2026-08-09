/**
 * Recortes do feed de produtos.
 *
 * Uma campanha de anúncio mira um público, não o estoque inteiro. Quem procura
 * um 911 não deve competir com o mesmo orçamento de quem procura um SUV
 * familiar, e a plataforma otimiza melhor quando cada feed é homogêneo.
 *
 * Os segmentos são DECLARADOS aqui, não montados por parâmetro de URL. Duas
 * razões: a URL cadastrada numa plataforma de anúncio precisa ser estável, e
 * filtro livre por querystring geraria infinitas variantes de cache — e um
 * recorte com um veículo só, publicado por engano, é dinheiro gasto num feed
 * que não representa a loja.
 */

import type { Vehicle } from '@/types'
import { classificarCarroceria, marcaCasaComFiltro, chaveDeComparacao } from './taxonomia-veiculo'

export interface Segmento {
  /** Último trecho da URL: /api/feed/produtos/<slug>. */
  slug: string
  titulo: string
  /** Por que este recorte existe — aparece no cabeçalho da resposta. */
  descricao: string
  seleciona: (veiculo: Vehicle) => boolean
}

function ehSuv(veiculo: Vehicle): boolean {
  // Pela classificação, não pelo rótulo cru: é ela que reconhece o SUV de teto
  // caído (X6, X4, Q8, GLE Coupé, Cayenne Coupé) que a origem rotula como
  // 'Conversível/Cupê'. Sem isso, 12 SUVs ficariam de fora do recorte de SUV.
  return classificarCarroceria({
    carroceria: veiculo.body_type,
    marca: veiculo.brand,
    modelo: veiculo.model,
    versao: veiculo.version,
    portas: veiculo.doors,
  }).includes('suv')
}

export const SEGMENTOS: Segmento[] = [
  {
    slug: 'porsche-911',
    titulo: 'Porsche 911',
    descricao: 'Somente Porsche 911, em todas as versões e anos disponíveis.',
    seleciona: v =>
      marcaCasaComFiltro(v.brand, 'porsche') && chaveDeComparacao(v.model) === '911',
  },
  {
    slug: 'ferrari',
    titulo: 'Ferrari',
    descricao: 'Todo o estoque Ferrari.',
    seleciona: v => marcaCasaComFiltro(v.brand, 'ferrari'),
  },
  {
    slug: 'suv-500-800',
    titulo: 'SUV de R$ 500 mil a R$ 800 mil',
    descricao: 'SUVs na faixa de 500 a 800 mil reais, incluindo os de carroceria cupê.',
    // Faixa fechada nas duas pontas: um carro de exatamente 800 mil pertence a
    // este recorte, não ao próximo.
    seleciona: v => ehSuv(v) && v.price >= 500_000 && v.price <= 800_000,
  },
]

export function segmentoPorSlug(slug: string): Segmento | null {
  const alvo = slug.trim().toLowerCase()
  return SEGMENTOS.find(s => s.slug === alvo) ?? null
}
