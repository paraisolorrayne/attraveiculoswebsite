import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
// NOTA: a Edge Function `ip-geo-updater` ainda é do Supabase (código não está
// no repo). Tem fallback (ipapi.co / ip-api.com), então segue funcionando; será
// recuperada/reescrita numa fase posterior da migração.
const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '.functions.supabase.co') || ''

interface GeoLocationResponse {
  city: string
  region: string
  country: string
  ip: string
}

// Upsert do cache de geolocalização de IP (expira em 7 dias)
async function upsertGeoCache(
  ip: string,
  data: { country_code: string | null; region: string | null; city: string | null },
): Promise<void> {
  const now = new Date()
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await db.insertInto('ip_geolocation_cache')
    .values({ ip_address: ip, ...data, cached_at: now, expires_at: expires })
    .onConflict((oc) => oc.column('ip_address').doUpdateSet({
      country_code: (eb) => eb.ref('excluded.country_code'),
      region: (eb) => eb.ref('excluded.region'),
      city: (eb) => eb.ref('excluded.city'),
      cached_at: now,
      expires_at: expires,
    }))
    .execute()
}

/**
 * API Route to fetch geolocation server-side
 * Uses: 1) ip_geolocation_cache → 2) Edge Function ip-geo-updater → 3) fallback APIs
 * Also updates visitor_sessions with geo data when session_db_id is provided
 */
export async function GET(request: Request) {
  try {
    // Get client IP from headers (set by reverse proxy: Nginx/Cloudflare/etc.)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || ''

    // Get optional session_db_id from query params
    const url = new URL(request.url)
    const sessionDbId = url.searchParams.get('session_db_id')

    console.log('[GeoLocation API] Client IP:', clientIp, 'Session:', sessionDbId)

    if (!clientIp) {
      return NextResponse.json({
        city: 'Não identificada',
        region: 'Não identificada',
        country: 'Brasil',
        ip: '',
      })
    }

    let geoData: GeoLocationResponse | null = null

    // Step 1: Check ip_geolocation_cache first
    try {
      const cached = await db.selectFrom('ip_geolocation_cache')
        .select(['country_code', 'region', 'city'])
        .where('ip_address', '=', clientIp)
        .where('expires_at', '>', new Date())
        .executeTakeFirst()

      if (cached && cached.city) {
        geoData = {
          city: cached.city,
          region: cached.region || 'Não identificada',
          country: cached.country_code || 'BR',
          ip: clientIp,
        }
        console.log('[GeoLocation API] Cache hit:', geoData.city)
      }
    } catch {
      // Cache miss, continue
    }

    // Step 2: Try Edge Function ip-geo-updater
    if (!geoData && SUPABASE_FUNCTIONS_URL) {
      try {
        const edgeResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/ip-geo-updater`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ ip_address: clientIp }),
          signal: AbortSignal.timeout(5000),
        })

        if (edgeResponse.ok) {
          const data = await edgeResponse.json()
          if (data.city || data.region || data.country_code) {
            geoData = {
              city: data.city || 'Não identificada',
              region: data.region || 'Não identificada',
              country: data.country_name || data.country_code || 'Brasil',
              ip: clientIp,
            }

            // Cache the result
            await upsertGeoCache(clientIp, {
              country_code: data.country_code || null,
              region: data.region || null,
              city: data.city || null,
            })

            console.log('[GeoLocation API] Edge Function success:', geoData.city)
          }
        }
      } catch (e) {
        console.error('[GeoLocation API] Edge Function failed:', e)
      }
    }

    // Step 3: Fallback to ipapi.co
    if (!geoData) {
      try {
        const ipapiResponse = await fetch(`https://ipapi.co/${clientIp}/json/`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000),
        })

        if (ipapiResponse.ok) {
          const data = await ipapiResponse.json()
          if (!data.error) {
            geoData = {
              city: data.city || 'Não identificada',
              region: data.region || 'Não identificada',
              country: data.country_name || 'Brasil',
              ip: data.ip || clientIp,
            }

            // Cache the result
            await upsertGeoCache(clientIp, {
              country_code: data.country_code || null,
              region: data.region || null,
              city: data.city || null,
            })
          }
        }
      } catch (e) {
        console.error('[GeoLocation API] ipapi.co failed:', e)
      }
    }

    // Step 4: Fallback to ip-api.com
    if (!geoData) {
      try {
        const ipApiResponse = await fetch(
          `http://ip-api.com/json/${clientIp}?fields=status,city,regionName,country,countryCode,query`,
          { signal: AbortSignal.timeout(5000) }
        )

        if (ipApiResponse.ok) {
          const data = await ipApiResponse.json()
          if (data.status === 'success') {
            geoData = {
              city: data.city || 'Não identificada',
              region: data.regionName || 'Não identificada',
              country: data.country || 'Brasil',
              ip: data.query || clientIp,
            }

            // Cache the result
            await upsertGeoCache(clientIp, {
              country_code: data.countryCode || null,
              region: data.regionName || null,
              city: data.city || null,
            })
          }
        }
      } catch (e) {
        console.error('[GeoLocation API] ip-api.com failed:', e)
      }
    }

    // Step 5: Update visitor_sessions with geo data if we have a session
    if (geoData && sessionDbId) {
      void db.updateTable('visitor_sessions')
        .set({ country_code: geoData.country, region: geoData.region, city: geoData.city })
        .where('id', '=', sessionDbId)
        .execute()
        .then(() => console.log('[GeoLocation API] Session geo updated:', sessionDbId))
        .catch((e) => console.error('[GeoLocation API] Session geo update error:', e))
    }

    if (geoData) {
      return NextResponse.json(geoData)
    }

    // Return default if all APIs fail
    return NextResponse.json({
      city: 'Não identificada',
      region: 'Não identificada',
      country: 'Brasil',
      ip: clientIp,
    })

  } catch (error) {
    console.error('[GeoLocation API] Error:', error)
    return NextResponse.json(
      { city: 'Não identificada', region: 'Não identificada', country: 'Brasil', ip: '' },
      { status: 200 }
    )
  }
}
