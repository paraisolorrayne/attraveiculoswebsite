import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy admin client for server-only routes (tracking, webhooks, admin metrics).
// Initialized on first use so `next build` page-data collection doesn't crash
// when env vars are missing in the build environment. The actual `createClient`
// call still happens on the first request, where env will fail loudly if absent.

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing Supabase admin credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
    )
  }
  _client = createClient(url, key)
  return _client
}

// Proxy that defers client creation until any property is read. Lets callers
// keep using `supabase.from(...)`, `supabase.rpc(...)` etc. unchanged.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
}) as SupabaseClient
