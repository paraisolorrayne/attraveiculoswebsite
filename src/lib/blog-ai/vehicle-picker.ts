/**
 * Vehicle picker for AI-generated blog posts.
 *
 * Responsibilities:
 * - Fetch eligible cars from AutoConf (> R$300k)
 * - Avoid re-using cars that were already reviewed recently
 * - Pair similar cars for "comparison" posts
 * - Best-effort match of a car name (from IG caption) to inventory
 */

import type { Vehicle } from '@/types'
import {
  fetchAutoConfVehicles,
  mapAutoConfToVehicle,
  type AutoConfVehicle,
} from '@/lib/autoconf-api'
import { db } from '@/lib/db'

// DB migrado supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

export const REVIEW_MIN_PRICE = 300_000

/**
 * Read titles of recent AI-generated blog posts to avoid repeating the same car.
 * We check the last `days` days.
 */
async function getRecentlyReviewedKeys(days = 60): Promise<Set<string>> {
  try {
    const since = new Date(Date.now() - days * 86_400_000)

    const data = await db.selectFrom('dual_blog_posts')
      .select(['title', 'car_review'])
      .where('published_date', '>=', since)
      .execute()

    const keys = new Set<string>()
    for (const row of data as Array<{
      title: string
      car_review?: { brand?: string; model?: string } | null
    }>) {
      const cr = row.car_review
      if (cr?.brand && cr?.model) {
        keys.add(`${cr.brand}|${cr.model}`.toLowerCase())
      }
    }
    return keys
  } catch {
    return new Set()
  }
}

function vehicleKey(v: Vehicle): string {
  return `${v.brand}|${v.model}`.toLowerCase()
}

/**
 * Fetch eligible vehicles from AutoConf priced above `minPrice`, mapped to our
 * internal `Vehicle` shape. Returns a sorted list (most expensive first).
 */
export async function getEligibleVehicles(
  minPrice = REVIEW_MIN_PRICE
): Promise<Vehicle[]> {
  const response = await fetchAutoConfVehicles({
    tipo: 'carros',
    registros_por_pagina: 100,
    preco_de: minPrice,
    ordenar: 'preco',
    ordem: 'desc',
  })

  const vehicles = response.veiculos
    .map(mapAutoConfToVehicle)
    .filter((v) => v.price >= minPrice)
    .filter((v) => (v.photos?.length ?? 0) > 0)

  return vehicles
}

/**
 * Pick a single vehicle for a `car_review` post.
 * Prefers cars we haven't written about in the last 60 days.
 */
export async function pickVehicleForReview(): Promise<Vehicle | null> {
  const eligible = await getEligibleVehicles()
  if (eligible.length === 0) return null

  const recent = await getRecentlyReviewedKeys()
  const fresh = eligible.filter((v) => !recent.has(vehicleKey(v)))

  const pool = fresh.length > 0 ? fresh : eligible
  // Deterministic-ish rotation by day-of-year so consecutive runs pick different cars
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  return pool[dayIndex % pool.length]
}

/**
 * Pick two vehicles for a comparison post.
 *
 * Strategy: pair cars in the same `category` when possible, otherwise closest
 * in price. Avoids pairing identical brand+model.
 */
export async function pickVehiclesForComparison(): Promise<
  [Vehicle, Vehicle] | null
> {
  const eligible = await getEligibleVehicles()
  if (eligible.length < 2) return null

  const recent = await getRecentlyReviewedKeys()
  const fresh = eligible.filter((v) => !recent.has(vehicleKey(v)))
  const pool = fresh.length >= 2 ? fresh : eligible

  // Group by category
  const byCategory = new Map<string, Vehicle[]>()
  for (const v of pool) {
    const list = byCategory.get(v.category) ?? []
    list.push(v)
    byCategory.set(v.category, list)
  }

  // Find a category with at least 2 different models
  for (const list of byCategory.values()) {
    const distinct = dedupeByBrandModel(list)
    if (distinct.length >= 2) {
      const dayIndex = Math.floor(Date.now() / 86_400_000)
      const first = distinct[dayIndex % distinct.length]
      const second = distinct.find((v) => vehicleKey(v) !== vehicleKey(first))
      if (second) return [first, second]
    }
  }

  // Fallback: pick two most expensive with different brand+model
  const distinct = dedupeByBrandModel(pool)
  if (distinct.length >= 2) return [distinct[0], distinct[1]]
  return null
}

function dedupeByBrandModel(vehicles: Vehicle[]): Vehicle[] {
  const seen = new Set<string>()
  const out: Vehicle[] = []
  for (const v of vehicles) {
    const key = vehicleKey(v)
    if (!seen.has(key)) {
      seen.add(key)
      out.push(v)
    }
  }
  return out
}

/**
 * Best-effort lookup of a vehicle matching a free-text car name
 * (typically extracted from an IG caption). Returns null if no good match.
 */
export async function findVehicleByName(
  carName: string
): Promise<Vehicle | null> {
  if (!carName) return null

  const needle = carName.toLowerCase()
  const response = await fetchAutoConfVehicles({
    tipo: 'carros',
    registros_por_pagina: 100,
  })

  // Score each vehicle by how many caption tokens appear in "brand model version"
  const tokens = needle
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)

  let best: { vehicle: AutoConfVehicle; score: number } | null = null

  for (const v of response.veiculos) {
    const haystack = `${v.marca_nome} ${v.modelopai_nome} ${v.modelo_nome} ${v.versao_descricao ?? ''}`.toLowerCase()
    let score = 0
    for (const t of tokens) {
      if (haystack.includes(t)) score += 1
    }
    if (!best || score > best.score) best = { vehicle: v, score }
  }

  if (!best || best.score < 2) return null // require at least 2 token matches
  return mapAutoConfToVehicle(best.vehicle)
}
