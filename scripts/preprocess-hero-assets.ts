/**
 * Pre-process hero/editorial vehicle assets — gera versão sem background
 * via Replicate (rembg) e salva no Supabase Storage. Idempotente: pula
 * veículos cujo cache já está atualizado.
 *
 * **Por que existir:** Replicate leva 5-30s pra processar uma foto. Se o
 * SSR tentar fazer isso em runtime, mata o LCP do site. Esta rotina roda
 * em background (CLI ou cron) garantindo que quando o usuário chegar,
 * o asset já está pronto no cache.
 *
 * **Escopo (intencional):** processa APENAS os top veículos que aparecem
 * em hero/editorial — não o estoque inteiro. Ou seja, ~9 veículos por
 * quinzena. Custo trivial (~R$ 0,03/execução).
 *
 * **Uso:**
 *   npx tsx scripts/preprocess-hero-assets.ts
 *
 * **Cron sugerido (VPS):**
 *   0 *\/6 * * *   cd /var/www/attra && npx tsx scripts/preprocess-hero-assets.ts >> /var/log/attra-hero-preprocess.log 2>&1
 *
 * **Env vars exigidas** (lê de .env.local ou .env.production):
 *   NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   REPLICATE_API_TOKEN
 *   AUTOCONF_BEARER_TOKEN
 *   AUTOCONF_DEALER_TOKEN
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Carrega env (.env.local em dev, .env.production em deploy)
const envLocal = path.resolve(process.cwd(), '.env.local')
const envProd = path.resolve(process.cwd(), '.env.production')
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal })
} else if (fs.existsSync(envProd)) {
  dotenv.config({ path: envProd })
}

// Imports DEPOIS do dotenv pra que process.env esteja populado
// (alguns módulos leem env vars no top-level)
import { getVehicles } from '../src/lib/autoconf-api'
import { Vehicle } from '../src/types'
import {
  getCachedHeroAsset,
  generateAndCacheHeroAsset,
} from '../src/lib/vehicle-hero-asset'

// Constantes alinhadas com src/app/(main)/page.tsx pra processar exatamente
// os mesmos veículos que aparecem no hero e na editorial selection.
const HERO_MIN_PRICE = 500_000
const HERO_POOL_SIZE = 6
const EDITORIAL_POOL_SIZE = 3
const CONCURRENCY = 2 // max paralelo (Replicate aceita mais, mas evita rate limit)

interface ProcessResult {
  vehicleId: string
  label: string
  status: 'ok' | 'rejected' | 'cached' | 'no-photo' | 'failed' | 'non-numeric-id'
  durationMs: number
}

async function processVehicle(vehicle: Vehicle): Promise<ProcessResult> {
  const label = `${vehicle.id} (${vehicle.brand} ${vehicle.model})`
  const start = Date.now()

  // Validação ID numérico — vehicle.id é tipado como string mas precisa
  // converter pra INTEGER no Supabase.
  if (Number.isNaN(parseInt(vehicle.id, 10))) {
    return { vehicleId: vehicle.id, label, status: 'non-numeric-id', durationMs: 0 }
  }

  const sourceUrl = vehicle.photos?.[0]
  if (!sourceUrl) {
    return { vehicleId: vehicle.id, label, status: 'no-photo', durationMs: 0 }
  }

  const cached = await getCachedHeroAsset(vehicle.id, sourceUrl)
  // Decisão já tomada pra esta foto (recorte aceito OU reprovado no gate) →
  // pula sem re-billar o Replicate. Linhas legadas têm no_bg e status NULL.
  if (cached && (cached.rembg_status || cached.no_bg_public_url)) {
    return {
      vehicleId: vehicle.id,
      label,
      status: 'cached',
      durationMs: Date.now() - start,
    }
  }

  // Sem decisão em cache → processa (roda os dois modelos + gate).
  console.log(`  [${label}] processando…`)
  const asset = await generateAndCacheHeroAsset(vehicle.id, vehicle.slug, sourceUrl)
  const status: ProcessResult['status'] = !asset
    ? 'failed'
    : asset.rembg_status === 'rejected'
      ? 'rejected'
      : 'ok'
  return {
    vehicleId: vehicle.id,
    label,
    status,
    durationMs: Date.now() - start,
  }
}

async function processInBatches(vehicles: Vehicle[]): Promise<ProcessResult[]> {
  const results: ProcessResult[] = []
  for (let i = 0; i < vehicles.length; i += CONCURRENCY) {
    const batch = vehicles.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(processVehicle))
    results.push(...batchResults)
  }
  return results
}

async function main() {
  console.log('[preprocess-hero] Iniciando…')
  const startedAt = Date.now()

  // Sanity check de env vars críticas
  const required = ['REPLICATE_API_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'AUTOCONF_BEARER_TOKEN']
  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.error(`[preprocess-hero] FATAL: env vars faltando: ${missing.join(', ')}`)
    process.exit(1)
  }

  console.log('[preprocess-hero] Buscando veículos do hero pool (preço >= R$', HERO_MIN_PRICE.toLocaleString('pt-BR'), ')…')

  let result
  try {
    result = await getVehicles({
      tipo: 'carros',
      registros_por_pagina: 50,
      ordenar: 'preco',
      ordem: 'desc',
      preco_de: HERO_MIN_PRICE,
    })
  } catch (error) {
    console.error('[preprocess-hero] Falha ao buscar veículos do Autoconf:', error)
    process.exit(1)
  }

  const premium = result.vehicles
    .filter((v) => v.price >= HERO_MIN_PRICE)
    .sort((a, b) => b.price - a.price)

  if (premium.length === 0) {
    console.log('[preprocess-hero] Nenhum veículo premium encontrado. Saindo sem erro.')
    process.exit(0)
  }

  const heroPool = premium.slice(0, HERO_POOL_SIZE)
  const editorialPool = premium.slice(HERO_POOL_SIZE, HERO_POOL_SIZE + EDITORIAL_POOL_SIZE)
  const targets = [...heroPool, ...editorialPool]

  console.log(`[preprocess-hero] ${targets.length} veículos pra checar (${heroPool.length} hero + ${editorialPool.length} editorial).`)
  console.log(`[preprocess-hero] Processando com concorrência ${CONCURRENCY}…\n`)

  const results = await processInBatches(targets)

  // Resumo
  const summary = {
    ok: 0,
    rejected: 0,
    cached: 0,
    failed: 0,
    'no-photo': 0,
    'non-numeric-id': 0,
  }
  let totalDuration = 0
  for (const r of results) {
    summary[r.status]++
    totalDuration += r.durationMs
    if (r.status === 'failed') {
      console.error(`  ✗ ${r.label}: FALHOU`)
    } else if (r.status === 'rejected') {
      console.log(`  ⚠ ${r.label}: recorte reprovado no gate — hero usa foto original`)
    } else if (r.status === 'ok') {
      console.log(`  ✓ ${r.label}: ${(r.durationMs / 1000).toFixed(1)}s`)
    }
  }

  // Cada veículo processado (ok OU rejected) roda os DOIS modelos → ~$0.016.
  const billed = summary.ok + summary.rejected
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log('\n[preprocess-hero] ────────────────────────────────────────')
  console.log(`  Recorte aceito:       ${summary.ok}`)
  console.log(`  Recorte reprovado:    ${summary.rejected} (usam foto original)`)
  console.log(`  Já em cache:          ${summary.cached}`)
  console.log(`  Sem foto:             ${summary['no-photo']}`)
  console.log(`  ID não-numérico:      ${summary['non-numeric-id']}`)
  console.log(`  Falharam:             ${summary.failed}`)
  console.log(`  Tempo total:          ${elapsedSec}s`)
  console.log(`  Custo estimado:       ~$${(billed * 0.016).toFixed(3)} (USD)`)
  console.log('[preprocess-hero] ────────────────────────────────────────')

  process.exit(summary.failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('[preprocess-hero] Erro fatal:', error)
  process.exit(1)
})
