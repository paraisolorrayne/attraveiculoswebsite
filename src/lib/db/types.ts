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

/** JSONB: lê objeto; grava qualquer valor (o driver pg serializa objetos).
 *  Insert/update tipados como `unknown` porque jsonb é schemaless e aceita
 *  interfaces específicas (BlogAuthor, etc.) sem index signature. */
type Json = ColumnType<Record<string, unknown>, unknown, unknown>
type JsonNullable = ColumnType<Record<string, unknown> | null, unknown, unknown>

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

// ─────────────────────────── CONTEÚDO / CONFIG ───────────────────────────

export interface SiteSettingsTable {
  id: Generated<string>
  key: string
  value: ColumnType<unknown, unknown, unknown> // jsonb (boolean/string/objeto)
  description: string | null
  updated_by: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface VehicleSectionContentTable {
  id: Generated<number> // BIGSERIAL
  vehicle_id: number
  vehicle_slug: string
  photo_count: number
  overview_photo_url: string
  exterior_photo_url: string
  interior_photo_url: string
  overview_copy: string | null
  exterior_copy: string | null
  interior_copy: string | null
  classified_at: Timestamp
  copy_generated_at: Timestamp | null
  created_at: Timestamp
  updated_at: Timestamp
}

// ─────────────────────────── VEÍCULOS (conteúdo) ───────────────────────────

export interface VehicleSoundsTable {
  id: Generated<string>
  vehicle_id: string
  vehicle_name: string
  vehicle_brand: string
  vehicle_slug: Generated<string>
  sound_file_url: string
  description: string | null
  icon: Generated<string>
  is_electric: Generated<boolean>
  is_active: Generated<boolean>
  display_order: Generated<number>
  created_at: Timestamp
  updated_at: Timestamp
}

export interface VehicleHeroAssetTable {
  id: Generated<number>
  vehicle_id: number
  vehicle_slug: string
  source_photo_url: string
  no_bg_storage_path: string | null
  no_bg_public_url: string | null
  rembg_score: number | null
  rembg_status: string | null
  composite_storage_path: string | null
  composite_public_url: string | null
  composite_generated_at: Timestamp | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface VehicleEmbeddingsTable {
  id: Generated<number>
  vehicle_id: number
  vehicle_slug: string
  passage_text: string
  embedding: string // pgvector VECTOR(1024) — string tipo '[...]'; match via SQL cru
  created_at: Timestamp
  updated_at: Timestamp
}

// ─────────────────────────── BLOG / NEWS ───────────────────────────

export interface DualBlogPostsTable {
  id: Generated<string>
  post_type: string
  title: string
  slug: string
  excerpt: Generated<string>
  content: Generated<string>
  featured_image: Generated<string>
  featured_image_alt: Generated<string>
  author: Json
  published_date: Timestamp
  updated_date: Timestamp | null
  reading_time: Generated<string>
  is_published: Generated<boolean>
  educativo: JsonNullable
  car_review: JsonNullable
  seo: Json
  source: Generated<string>
  created_at: Timestamp
  updated_at: Timestamp
}

export interface BlogPostsTable {
  id: Generated<string>
  slug: string
  title: string
  excerpt: string
  content: string
  featured_image: string | null
  category_id: string | null
  tags: Generated<string[]>
  author: string
  seo_title: string | null
  seo_description: string | null
  is_published: Generated<boolean>
  published_at: Timestamp | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface BlogAiGenerationsTable {
  id: Generated<string>
  run_date: Generated<string>
  run_at: Timestamp
  strategy: string
  blog_post_id: string | null
  source: Json
  success: Generated<boolean>
  error_message: string | null
  created_at: Timestamp
}

export interface NewsCyclesTable {
  id: Generated<string>
  week_start: string
  week_end: string
  is_active: Generated<boolean>
  created_at: Timestamp
  updated_at: Timestamp
}

export interface NewsCategoriesTable {
  id: Generated<number>
  slug: string
  name: string
  description: string | null
  created_at: Timestamp
}

export interface NewsSourcesTable {
  id: Generated<number>
  slug: string
  name: string
  created_at: Timestamp
}

export interface NewsArticlesTable {
  id: Generated<string>
  // slug existe no banco vivo (o código insere/consulta), mesmo ausente nas
  // migrations do repo — divergência a reconciliar no dump da Fase 1.
  slug: Generated<string>
  news_cycle_id: string
  category_id: number
  source_id: number
  title: string
  description: string | null
  content: string | null
  image_url: string | null
  source_name: string
  original_url: string
  published_at: Timestamp
  is_featured: Generated<boolean>
  featured_order: number | null
  created_at: Timestamp
  updated_at: Timestamp
}

// ─────────────────────────── MARKETING ───────────────────────────

export interface MarketingStrategiesTable {
  id: Generated<string>
  name: string
  description: string | null
  category: string
  status: Generated<string>
  budget: ColumnType<number | null, number | string | null, number | string | null>
  start_date: string | null
  end_date: string | null
  goals: Json
  created_by: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface MarketingTasksTable {
  id: Generated<string>
  title: string
  description: string | null
  strategy_id: string | null
  category: string
  status: Generated<string>
  priority: Generated<string>
  due_date: Timestamp | null
  estimated_hours: ColumnType<number | null, number | string | null, number | string | null>
  actual_hours: ColumnType<number | null, number | string | null, number | string | null>
  created_by: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface TaskAssignmentsTable {
  id: Generated<string>
  task_id: string
  user_id: string
  assigned_by: string | null
  assigned_at: Timestamp
}

export interface TaskCommentsTable {
  id: Generated<string>
  task_id: string
  user_id: string
  content: string
  created_at: Timestamp
  updated_at: Timestamp
}

export interface TaskStatusHistoryTable {
  id: Generated<string>
  task_id: string
  old_status: string | null
  new_status: string
  changed_by: string | null
  changed_at: Timestamp
}

export interface MarketingCampaignsTable {
  id: Generated<string>
  name: string
  description: string | null
  status: Generated<string>
  created_by: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface MarketingCreativesTable {
  id: Generated<string>
  image_url: string
  vehicle_name: string | null
  created_by: string | null
  created_by_name: string | null
  status: Generated<string>
  created_at: Timestamp
}

export interface CampaignVehiclesTable {
  id: Generated<string>
  campaign_id: string
  vehicle_name: string
  added_date: string | null
  notes: string | null
  display_order: Generated<number>
  ended_date: string | null
  end_reason: string | null
  created_at: Timestamp
}

// ─────────────────────────── NEWSLETTER / CRM / INFRA ───────────────────────────

export interface NewsletterCampaignsTable {
  id: Generated<string>
  title: string
  subject: string | null
  featured_image: string | null
  sections: Json
  html_content: string | null
  status: Generated<string>
  scheduled_at: Timestamp | null
  sent_at: Timestamp | null
  recipient_count: Generated<number>
  created_by: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface NewsletterSubscribersTable {
  id: Generated<string>
  email: string
  name: string | null
  is_active: Generated<boolean>
  source: Generated<string>
  subscribed_at: Timestamp
  unsubscribed_at: Timestamp | null
  created_at: Timestamp
}

export interface CrmCardsTable {
  id: string
  etapa: string
  nome: string | null
  telefone: string | null
  email: string | null
  veiculo: string | null
  valor: ColumnType<number | null, number | string | null, number | string | null>
  origem: string | null
  vendedor: string | null
  dados: JsonNullable
  criado_em: Timestamp
  atualizado_em: Timestamp
}

export interface InventorySnapshotsTable {
  id: Generated<string>
  source: string
  payload: Json
  vehicle_count: Generated<number>
  created_at: Timestamp
}

export interface AdminUsersTable {
  id: string
  email: string
  role: Generated<string> // admin | owner | operador | marketing | gerente
  name: string | null
  is_active: Generated<boolean>
  last_login_at: Timestamp | null
  password_hash: string | null // bcrypt (Auth.js Credentials) — Fase 5
  created_at: Timestamp
  updated_at: Timestamp
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
  site_settings: SiteSettingsTable
  vehicle_section_content: VehicleSectionContentTable
  vehicle_sounds: VehicleSoundsTable
  vehicle_hero_asset: VehicleHeroAssetTable
  vehicle_embeddings: VehicleEmbeddingsTable
  dual_blog_posts: DualBlogPostsTable
  blog_posts: BlogPostsTable
  blog_ai_generations: BlogAiGenerationsTable
  news_cycles: NewsCyclesTable
  news_categories: NewsCategoriesTable
  news_sources: NewsSourcesTable
  news_articles: NewsArticlesTable
  marketing_strategies: MarketingStrategiesTable
  marketing_tasks: MarketingTasksTable
  task_assignments: TaskAssignmentsTable
  task_comments: TaskCommentsTable
  task_status_history: TaskStatusHistoryTable
  marketing_campaigns: MarketingCampaignsTable
  marketing_creatives: MarketingCreativesTable
  campaign_vehicles: CampaignVehiclesTable
  newsletter_campaigns: NewsletterCampaignsTable
  newsletter_subscribers: NewsletterSubscribersTable
  crm_cards: CrmCardsTable
  inventory_snapshots: InventorySnapshotsTable
  admin_users: AdminUsersTable
}
