/**
 * Carro em destaque da página de links (bio do Instagram).
 *
 * Tem de estar à venda agora: um carro vendido não pode aparecer como
 * disponível (avaliação da página de links, 04/11/2026). Antes, a página era
 * ISR com o cache de 5 minutos da AutoConf, que serve a cópia velha a quem chega
 * primeiro depois de um tempo sem visita, e numa falha da AutoConf caía na
 * cópia de reserva do estoque. Agora a lista vem da AutoConf ao vivo, guardada
 * em memória por 1 minuto. Se a AutoConf falhar, vale a última lista de até
 * 10 minutos; mais velha que isso, a página sai sem destaque.
 */

import { fetchAutoConfVehicles, mapAutoConfToVehicle } from '@/lib/autoconf-api'
import { isPubliclyListed } from '@/app/api/llm/_inventory'
import type { Vehicle } from '@/types'

const VALIDADE_MS = 60_000
const RESERVA_MS = 10 * 60_000

/** Faixa de preço do destaque e quantos dos mais caros entram no sorteio. */
const PRECO_MIN = 1_000_000
const PRECO_MAX = 5_000_000
const CANDIDATOS = 5

type Busca = () => Promise<Vehicle[]>

async function buscarNaAutoConf(): Promise<Vehicle[]> {
  const resposta = await fetchAutoConfVehicles(
    { tipo: 'carros', registros_por_pagina: 20, ordenar: 'preco', ordem: 'desc', preco_de: PRECO_MIN, preco_ate: PRECO_MAX },
    { aoVivo: true },
  )
  return resposta.veiculos.map(mapAutoConfToVehicle)
}

let ultima: { em: number; veiculos: Vehicle[] } | null = null
let emAndamento: Promise<Vehicle[] | null> | null = null

/** Só para os testes. */
export function esquecerEstoqueDaBio() {
  ultima = null
  emAndamento = null
}

/** Estoque da faixa do destaque, de no máximo 1 minuto (10 numa falha), ou null. */
export async function estoqueDaBio(agora = Date.now(), buscar: Busca = buscarNaAutoConf): Promise<Vehicle[] | null> {
  if (ultima && agora - ultima.em < VALIDADE_MS) return ultima.veiculos
  emAndamento ??= buscar()
    .then(veiculos => {
      ultima = { em: agora, veiculos }
      return veiculos
    })
    .catch(error => {
      console.error('[links] AutoConf fora do ar para o destaque:', error)
      return ultima && agora - ultima.em < RESERVA_MS ? ultima.veiculos : null
    })
    .finally(() => {
      emAndamento = null
    })
  return emAndamento
}

/** Um dos mais caros da faixa, com foto e à venda; null se não houver. */
export function escolherDestaque(veiculos: Vehicle[] | null, sorteio = Math.random): Vehicle | null {
  const candidatos = (veiculos ?? [])
    .filter(v => isPubliclyListed(v) && v.price >= PRECO_MIN && v.price <= PRECO_MAX && v.photos?.[0])
    .sort((a, b) => b.price - a.price)
    .slice(0, CANDIDATOS)
  if (candidatos.length === 0) return null
  return candidatos[Math.floor(sorteio() * candidatos.length)] ?? candidatos[0]
}
