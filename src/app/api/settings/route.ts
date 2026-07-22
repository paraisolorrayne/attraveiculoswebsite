import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Default settings if database is not available
const DEFAULT_SETTINGS = {
  listen_to_content_enabled: true,
  engine_sound_section_enabled: true,
}

/**
 * GET /api/settings
 * Public endpoint to fetch site settings
 * Used by frontend components to check feature flags
 */
export async function GET() {
  try {
    const settings = await db.selectFrom('site_settings').select(['key', 'value']).execute()

    // Convert array to object with defaults
    const settingsObject: Record<string, unknown> = { ...DEFAULT_SETTINGS }

    for (const setting of settings) {
      settingsObject[setting.key] = setting.value
    }

    return NextResponse.json({
      settings: settingsObject 
    }, {
      headers: {
        // Cache for 30 seconds to reduce DB calls but still allow real-time updates
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      }
    })
  } catch (error) {
    console.error('Error in public settings GET:', error)
    return NextResponse.json({ settings: DEFAULT_SETTINGS })
  }
}

