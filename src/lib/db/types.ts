/**
 * Tipos do banco pro Kysely — parte da migração Supabase → Postgres puro na VPS
 * (ver docs/MIGRACAO_POSTGRES_PURO.md).
 *
 * ESTRATÉGIA: o `Database` cresce por MÓDULO, na ordem do estrangulamento.
 * A primeira fatia é o TRACKING (writes service-role, sem auth/RLS — o mais
 * seguro de migrar). Conforme cada módulo sai do supabase-js, suas tabelas
 * são adicionadas aqui.
 *
 * Convenções Kysely:
 *   - `Generated<T>`: coluna com default no banco (id, created_at) — opcional no INSERT.
 *   - `ColumnType<Select, Insert, Update>`: quando os três diferem.
 *   - Timestamps chegam como Date (driver pg) — tipamos como Date na leitura.
 */
import type { Generated, ColumnType } from 'kysely'

/** TIMESTAMPTZ: lê Date; no insert/update aceita Date ou ISO string (default no banco). */
type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>

/** JSONB: lê objeto; grava objeto/string/`sql` (default no banco). */
type Json = ColumnType<Record<string, unknown>, Record<string, unknown> | string | undefined, Record<string, unknown> | string>
type JsonNullable = ColumnType<Record<string, unknown> | null, Record<string, unknown> | string | null, Record<string, unknown> | string | null>

// ─────────────────────────── TRACKING ───────────────────────────

export interface VisitorFingerprintsTable {
  id: Generated<string>
  visitor_id: string
  browser_name: string | null
  browser_version: string | null
  os_name: string | null
  os_version: string | null
  device_type: string | null
  screen_resolution: string | null
  timezone: string | null
  language: string | null
  confidence_score: ColumnType<number | null, number | string | null, number | string | null>
  first_seen_at: Timestamp
  last_seen_at: Timestamp
  total_visits: Generated<number>
  resolved_profile_id: string | null
  is_bot: Generated<boolean>
  created_at: Timestamp
  updated_at: Timestamp
}

export interface VisitorSessionsTable {
  id: Generated<string>
  fingerprint_id: string
  session_id: string
  started_at: Timestamp
  ended_at: Timestamp | null
  duration_seconds: number | null
  // Origem do tráfego
  referrer_url: string | null
  referrer_domain: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  // Click IDs (20260219) + campaign IDs (20260420)
  gclid: string | null
  fbclid: string | null
  ttclid: string | null
  utm_id: string | null
  adset_id: string | null
  ad_id: string | null
  // Geo
  ip_address: string | null
  country_code: string | null
  region: string | null
  city: string | null
  // Métricas / eventos
  page_views_count: Generated<number>
  vehicles_viewed: Generated<number>
  contacted_whatsapp: Generated<boolean>
  submitted_form: Generated<boolean>
  used_calculator: Generated<boolean>
  // Heartbeat + extras (20260226_tracking_improvements)
  last_activity_at: Timestamp
  metadata: Generated<Record<string, unknown>>
  created_at: Timestamp
}

export interface VisitorProfilesTable {
  id: Generated<string>
  // Identificadores
  email: string | null
  phone: string | null
  cpf_hash: string | null
  // Pessoais
  first_name: string | null
  last_name: string | null
  full_name: string | null
  // Profissionais (B2B)
  company_name: string | null
  company_domain: string | null
  company_industry: string | null
  company_size: string | null
  job_title: string | null
  linkedin_url: string | null
  // Enriquecimento
  enrichment_source: string | null
  enrichment_data: ColumnType<Record<string, unknown>, Record<string, unknown> | string | undefined, Record<string, unknown> | string>
  enriched_at: Timestamp | null
  // Scores
  lead_score: Generated<number>
  engagement_score: Generated<number>
  // Status
  status: Generated<string>
  converted_to_lead_id: string | null
  // LGPD (base + 20260219)
  consent_marketing: Generated<boolean>
  consent_tracking: Generated<boolean>
  consent_date: Timestamp | null
  consent_given: Generated<boolean>
  consent_given_at: Timestamp | null
  legitimate_interest_basis: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface IdentityEventsTable {
  id: Generated<string>
  fingerprint_id: string | null
  profile_id: string | null
  event_type: string
  event_data: ColumnType<Record<string, unknown>, Record<string, unknown> | string | undefined, Record<string, unknown> | string>
  source: string | null
  created_at: Timestamp
}

export interface VisitorPageViewsTable {
  id: Generated<string>
  session_id: string
  fingerprint_id: string
  page_url: string
  page_path: string
  page_title: string | null
  page_type: string | null
  vehicle_id: string | null
  vehicle_slug: string | null
  vehicle_brand: string | null
  vehicle_model: string | null
  vehicle_price: ColumnType<number | null, number | string | null, number | string | null>
  time_on_page_seconds: number | null
  scroll_depth_percent: number | null
  clicked_whatsapp: Generated<boolean>
  clicked_phone: Generated<boolean>
  clicked_form: Generated<boolean>
  played_engine_sound: Generated<boolean>
  viewed_at: Timestamp
}

export interface ConversionEventsTable {
  id: Generated<string>
  fingerprint_id: string | null
  profile_id: string | null
  session_id: string | null
  event_name: string
  event_value: ColumnType<number | null, number | string | null, number | string | null>
  currency: Generated<string>
  gclid: string | null
  fbclid: string | null
  ttclid: string | null
  hashed_email: string | null
  hashed_phone: string | null
  sent_to_google: Generated<boolean>
  sent_to_google_at: Timestamp | null
  google_response: JsonNullable
  sent_to_meta: Generated<boolean>
  sent_to_meta_at: Timestamp | null
  meta_response: JsonNullable
  page_path: string | null
  vehicle_id: string | null
  metadata: Json
  created_at: Timestamp
}

export interface IpGeolocationCacheTable {
  ip_address: string // INET PK — obrigatório no insert
  country_code: string | null
  region: string | null
  city: string | null
  cached_at: Timestamp
  expires_at: Timestamp
}

/**
 * Interface raiz do banco. Chave = nome da tabela no schema `public`.
 * Adicione novas tabelas AQUI conforme cada módulo migra do supabase-js.
 */
export interface Database {
  visitor_fingerprints: VisitorFingerprintsTable
  visitor_sessions: VisitorSessionsTable
  visitor_page_views: VisitorPageViewsTable
  identity_events: IdentityEventsTable
  visitor_profiles: VisitorProfilesTable
  conversion_events: ConversionEventsTable
  ip_geolocation_cache: IpGeolocationCacheTable
  // TODO(migração): vehicles, admin_users, dual_blog_posts, vehicle_embeddings,
  // news_*, marketing_*, etc.
}
