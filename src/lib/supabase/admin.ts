import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Create a Supabase Admin client with service role key.
 *
 * This module is intentionally separate from `./server.ts` so that callers
 * (e.g. `inventory-snapshot.ts`) do NOT transitively import `cookies` from
 * `next/headers`.  Pulling `next/headers` into modules used by statically
 * generated pages can break the standalone build on some Node versions.
 *
 * IMPORTANT: This bypasses Row Level Security (RLS).
 * Only use for server-side operations that need elevated privileges.
 * NEVER expose this client to the browser.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
