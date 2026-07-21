DROP TABLE IF EXISTS conversion_events, ip_geolocation_cache, identity_events, visitor_page_views, visitor_sessions, visitor_profiles, visitor_fingerprints CASCADE;

CREATE TABLE visitor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT, phone TEXT, cpf_hash TEXT,
  first_name TEXT, last_name TEXT, full_name TEXT,
  company_name TEXT, company_domain TEXT, company_industry TEXT, company_size TEXT, job_title TEXT, linkedin_url TEXT,
  enrichment_source TEXT, enrichment_data JSONB DEFAULT '{}', enriched_at TIMESTAMPTZ,
  lead_score INTEGER DEFAULT 0, engagement_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'anonymous',
  converted_to_lead_id UUID,
  consent_marketing BOOLEAN DEFAULT FALSE, consent_tracking BOOLEAN DEFAULT TRUE, consent_date TIMESTAMPTZ,
  consent_given BOOLEAN DEFAULT FALSE, consent_given_at TIMESTAMPTZ, legitimate_interest_basis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE visitor_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL UNIQUE,
  browser_name TEXT, browser_version TEXT, os_name TEXT, os_version TEXT,
  device_type TEXT, screen_resolution TEXT, timezone TEXT, language TEXT,
  confidence_score DECIMAL(5,4),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_visits INTEGER DEFAULT 1,
  resolved_profile_id UUID,
  is_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_id UUID NOT NULL REFERENCES visitor_fingerprints(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ, duration_seconds INTEGER,
  referrer_url TEXT, referrer_domain TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
  gclid TEXT, fbclid TEXT, ttclid TEXT, utm_id TEXT, adset_id TEXT, ad_id TEXT,
  ip_address INET, country_code TEXT, region TEXT, city TEXT,
  page_views_count INTEGER DEFAULT 0, vehicles_viewed INTEGER DEFAULT 0,
  contacted_whatsapp BOOLEAN DEFAULT FALSE, submitted_form BOOLEAN DEFAULT FALSE, used_calculator BOOLEAN DEFAULT FALSE,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE visitor_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  fingerprint_id UUID NOT NULL REFERENCES visitor_fingerprints(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL, page_path TEXT NOT NULL, page_title TEXT, page_type TEXT,
  vehicle_id TEXT, vehicle_slug TEXT, vehicle_brand TEXT, vehicle_model TEXT, vehicle_price DECIMAL(12,2),
  time_on_page_seconds INTEGER, scroll_depth_percent INTEGER,
  clicked_whatsapp BOOLEAN DEFAULT FALSE, clicked_phone BOOLEAN DEFAULT FALSE,
  clicked_form BOOLEAN DEFAULT FALSE, played_engine_sound BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_id UUID REFERENCES visitor_fingerprints(id) ON DELETE CASCADE,
  profile_id UUID,
  event_type TEXT NOT NULL, event_data JSONB DEFAULT '{}', source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_id UUID REFERENCES visitor_fingerprints(id) ON DELETE CASCADE,
  profile_id UUID, session_id UUID,
  event_name TEXT NOT NULL, event_value DECIMAL(12,2), currency TEXT DEFAULT 'BRL',
  gclid TEXT, fbclid TEXT, ttclid TEXT, hashed_email TEXT, hashed_phone TEXT,
  sent_to_google BOOLEAN DEFAULT FALSE, sent_to_google_at TIMESTAMPTZ, google_response JSONB,
  sent_to_meta BOOLEAN DEFAULT FALSE, sent_to_meta_at TIMESTAMPTZ, meta_response JSONB,
  page_path TEXT, vehicle_id TEXT, metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ip_geolocation_cache (
  ip_address INET PRIMARY KEY,
  country_code TEXT, region TEXT, city TEXT,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);
