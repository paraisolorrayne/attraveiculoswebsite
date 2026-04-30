import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'
import type { AutoConfResponse, AutoConfVehicle } from './autoconf-api'

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

function getAdmin() {
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

export async function saveInventorySnapshot(
  source: SnapshotSource,
  payload: unknown,
  vehicleCount: number,
): Promise<void> {
  const admin = getAdmin()
  if (!admin) return
  const { error } = await admin.from('inventory_snapshots').insert({
    source,
    payload: payload as Json,
    vehicle_count: vehicleCount,
  })
  if (error) {
    console.error('[inventory-snapshot] save failed:', source, error.message)
  }
}

async function loadLatestSnapshot<T>(source: SnapshotSource): Promise<T | null> {
  const admin = getAdmin()
  if (!admin) return null
  const { data, error } = await admin
    .from('inventory_snapshots')
    .select('payload')
    .eq('source', source)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[inventory-snapshot] load failed:', source, error.message)
    return null
  }
  return (data?.payload as T) ?? null
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
  const admin = getAdmin()
  if (!admin) return
  const existing = await loadLatestSnapshot<Record<string, AutoConfVehicle>>(SOURCE_VEHICLE)
  const next = { ...(existing || {}), [String(vehicleId)]: vehicle }
  const { error } = await admin.from('inventory_snapshots').insert({
    source: SOURCE_VEHICLE,
    payload: next as unknown as Json,
    vehicle_count: Object.keys(next).length,
  })
  if (error) {
    console.error('[inventory-snapshot] append vehicle failed:', error.message)
  }
}

export function loadLatestAdsHomeSnapshot<T>(): Promise<T | null> {
  return loadLatestSnapshot<T>(SOURCE_ADS_HOME)
}
