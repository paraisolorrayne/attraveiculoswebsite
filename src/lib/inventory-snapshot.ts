import { db } from '@/lib/db'
import type { AutoConfResponse, AutoConfVehicle } from './autoconf-api'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
// Funções tolerantes a falha (cache não-crítico): erro → log + null/void.

const SOURCE_LIST = 'autoconf:veiculos:list'
const SOURCE_VEHICLE = 'autoconf:veiculos:byId'
const SOURCE_ADS_HOME = 'autoconf:ads-home'

type SnapshotSource =
  | typeof SOURCE_LIST
  | typeof SOURCE_VEHICLE
  | typeof SOURCE_ADS_HOME

export const InventorySnapshotSources = {
  list: SOURCE_LIST,
  vehicle: SOURCE_VEHICLE,
  adsHome: SOURCE_ADS_HOME,
} as const

// Só a linha mais recente por source é lida (loadLatestSnapshot). Sem poda,
// a tabela cresce sem limite. Mantemos uma folga de 5 por source.
const KEEP_PER_SOURCE = 5

async function pruneOldSnapshots(source: SnapshotSource): Promise<void> {
  try {
    const keep = await db.selectFrom('inventory_snapshots')
      .select('created_at')
      .where('source', '=', source)
      .orderBy('created_at', 'desc')
      .limit(1).offset(KEEP_PER_SOURCE - 1)
      .executeTakeFirst()
    if (!keep) return
    await db.deleteFrom('inventory_snapshots')
      .where('source', '=', source)
      .where('created_at', '<', keep.created_at)
      .execute()
  } catch (error) {
    console.error('[inventory-snapshot] prune failed:', source, error)
  }
}

export async function saveInventorySnapshot(
  source: SnapshotSource,
  payload: unknown,
  vehicleCount: number,
): Promise<void> {
  try {
    await db.insertInto('inventory_snapshots')
      .values({ source, payload, vehicle_count: vehicleCount })
      .execute()
  } catch (error) {
    console.error('[inventory-snapshot] save failed:', source, error)
    return
  }
  // Poda fire-and-forget: falha não afeta o save
  pruneOldSnapshots(source).catch(() => {})
}

async function loadLatestSnapshot<T>(source: SnapshotSource): Promise<T | null> {
  try {
    const data = await db.selectFrom('inventory_snapshots')
      .select('payload')
      .where('source', '=', source)
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst()
    return (data?.payload as T) ?? null
  } catch (error) {
    console.error('[inventory-snapshot] load failed:', source, error)
    return null
  }
}

export function loadLatestListSnapshot(): Promise<AutoConfResponse | null> {
  return loadLatestSnapshot<AutoConfResponse>(SOURCE_LIST)
}

export function loadLatestVehicleSnapshot(
  vehicleId: number,
): Promise<AutoConfVehicle | null> {
  return loadLatestSnapshot<Record<string, AutoConfVehicle>>(SOURCE_VEHICLE).then(
    (map) => map?.[String(vehicleId)] ?? null,
  )
}

export async function appendVehicleToSnapshot(
  vehicleId: number,
  vehicle: AutoConfVehicle,
): Promise<void> {
  const existing = await loadLatestSnapshot<Record<string, AutoConfVehicle>>(SOURCE_VEHICLE)
  const next = { ...(existing || {}), [String(vehicleId)]: vehicle }
  try {
    await db.insertInto('inventory_snapshots')
      .values({ source: SOURCE_VEHICLE, payload: next, vehicle_count: Object.keys(next).length })
      .execute()
  } catch (error) {
    console.error('[inventory-snapshot] append vehicle failed:', error)
    return
  }
  pruneOldSnapshots(SOURCE_VEHICLE).catch(() => {})
}

export function loadLatestAdsHomeSnapshot<T>(): Promise<T | null> {
  return loadLatestSnapshot<T>(SOURCE_ADS_HOME)
}
