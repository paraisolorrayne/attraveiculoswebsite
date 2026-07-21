import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

export interface SiteSettings {
  listen_to_content_enabled: boolean
  engine_sound_section_enabled: boolean
}

const DEFAULT_SETTINGS: SiteSettings = {
  listen_to_content_enabled: true,
  engine_sound_section_enabled: true,
}

/**
 * Fetch site settings from Supabase
 * For use in Server Components and API routes
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const settings = await db.selectFrom('site_settings').select(['key', 'value']).execute()

    // Convert array to object with defaults
    const settingsObject: SiteSettings = { ...DEFAULT_SETTINGS }

    for (const setting of settings) {
      if (setting.key === 'listen_to_content_enabled') {
        settingsObject.listen_to_content_enabled = setting.value === true
      }
      if (setting.key === 'engine_sound_section_enabled') {
        settingsObject.engine_sound_section_enabled = setting.value === true
      }
    }

    return settingsObject
  } catch (error) {
    console.error('Error in getSiteSettings:', error)
    return DEFAULT_SETTINGS
  }
}

/**
 * Check if a specific setting is enabled
 */
export async function isSettingEnabled(key: keyof SiteSettings): Promise<boolean> {
  const settings = await getSiteSettings()
  return settings[key]
}

