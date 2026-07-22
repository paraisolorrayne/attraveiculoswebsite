/**
 * Vehicle Sounds Storage Service — associações veículo↔som.
 * Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
 */

import { db } from '@/lib/db'
import type { Selectable } from 'kysely'
import type { VehicleSoundsTable } from '@/lib/db/types'

export interface VehicleSoundRecord {
  id: string
  vehicle_id: string
  vehicle_name: string
  vehicle_brand: string
  vehicle_slug: string
  sound_file_url: string
  description: string | null
  icon: string
  is_electric: boolean
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

// Kysely devolve Date em timestamptz — normaliza pra ISO string (contrato antigo)
function toRecord(r: Selectable<VehicleSoundsTable>): VehicleSoundRecord {
  return {
    ...r,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  }
}

// Read all sound records
export async function getAllVehicleSounds(): Promise<VehicleSoundRecord[]> {
  try {
    const rows = await db.selectFrom('vehicle_sounds').selectAll()
      .orderBy('display_order', 'asc').execute()
    return rows.map(toRecord)
  } catch (error) {
    console.error('Error in getAllVehicleSounds:', error)
    return []
  }
}

// Get active sound records (for public display)
export async function getActiveVehicleSounds(): Promise<VehicleSoundRecord[]> {
  try {
    const rows = await db.selectFrom('vehicle_sounds').selectAll()
      .where('is_active', '=', true)
      .orderBy('display_order', 'asc').execute()
    return rows.map(toRecord)
  } catch (error) {
    console.error('Error in getActiveVehicleSounds:', error)
    return []
  }
}

// Get a single sound record by ID
export async function getVehicleSoundById(id: string): Promise<VehicleSoundRecord | null> {
  try {
    const row = await db.selectFrom('vehicle_sounds').selectAll()
      .where('id', '=', id).executeTakeFirst()
    return row ? toRecord(row) : null
  } catch (error) {
    console.error('Error in getVehicleSoundById:', error)
    return null
  }
}

// Create a new sound record
export async function createVehicleSound(
  data: Omit<VehicleSoundRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<VehicleSoundRecord> {
  const row = await db.insertInto('vehicle_sounds').values(data)
    .returningAll().executeTakeFirstOrThrow()
  return toRecord(row)
}

// Update a sound record
export async function updateVehicleSound(
  id: string,
  data: Partial<Omit<VehicleSoundRecord, 'id' | 'created_at'>>
): Promise<VehicleSoundRecord | null> {
  try {
    const row = await db.updateTable('vehicle_sounds').set(data)
      .where('id', '=', id).returningAll().executeTakeFirst()
    return row ? toRecord(row) : null
  } catch (error) {
    console.error('Error in updateVehicleSound:', error)
    return null
  }
}

// Delete a sound record
export async function deleteVehicleSound(id: string): Promise<boolean> {
  try {
    await db.deleteFrom('vehicle_sounds').where('id', '=', id).execute()
    return true
  } catch (error) {
    console.error('Error deleting vehicle sound:', error)
    return false
  }
}

// Check if a vehicle already has a sound associated
export async function vehicleHasSound(vehicleId: string): Promise<boolean> {
  try {
    const row = await db.selectFrom('vehicle_sounds').select('id')
      .where('vehicle_id', '=', vehicleId).limit(1).executeTakeFirst()
    return !!row
  } catch (error) {
    console.error('Error in vehicleHasSound:', error)
    return false
  }
}

// Get sound record by vehicle ID (for vehicle detail pages)
export async function getVehicleSoundByVehicleId(vehicleId: string): Promise<VehicleSoundRecord | null> {
  try {
    const row = await db.selectFrom('vehicle_sounds').selectAll()
      .where('vehicle_id', '=', vehicleId)
      .where('is_active', '=', true)
      .executeTakeFirst()
    return row ? toRecord(row) : null
  } catch (error) {
    console.error('Error in getVehicleSoundByVehicleId:', error)
    return null
  }
}
