export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      vehicles: {
        Row: {
          id: string
          slug: string
          brand: string
          model: string
          version: string | null
          year_manufacture: number
          year_model: number
          color: string
          mileage: number
          fuel_type: string
          transmission: string
          price: number
          category: string
          body_type: string
          location_id: string
          photos: string[]
          videos: string[] | null
          options: string[] | null
          description: string | null
          seo_title: string | null
          seo_description: string | null
          status: 'available' | 'reserved' | 'sold' | 'highlight'
          is_featured: boolean
          is_new: boolean
          created_at: string
          updated_at: string
          crm_id: string | null
          // Extended fields for cinematic experience
          horsepower: number | null
          torque: number | null
          acceleration: number | null
          top_speed: number | null
          engine: string | null
          origin: 'national' | 'imported' | null
          audio_url: string | null
        }
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>
      }
      locations: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          state: string
          zip_code: string
          phone: string
          whatsapp: string
          email: string
          latitude: number | null
          longitude: number | null
          hours: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['locations']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['locations']['Insert']>
      }
      blog_posts: {
        Row: {
          id: string
          slug: string
          title: string
          excerpt: string
          content: string
          featured_image: string | null
          category_id: string
          tags: string[]
          author: string
          seo_title: string | null
          seo_description: string | null
          is_published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['blog_posts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['blog_posts']['Insert']>
      }
      blog_categories: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['blog_categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['blog_categories']['Insert']>
      }
      contact_submissions: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          subject: string
          message: string
          vehicle_id: string | null
          source_page: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['contact_submissions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['contact_submissions']['Insert']>
      }
      webhook_events: {
        Row: {
          id: string
          event_type: string
          payload: Json
          source_page: string
          vehicle_id: string | null
          session_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['webhook_events']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['webhook_events']['Insert']>
      }
      vehicle_sounds: {
        Row: {
          id: string
          vehicle_id: string // AutoConf vehicle ID
          vehicle_name: string // Cached display name (e.g., "Ferrari 812 Superfast")
          vehicle_brand: string // Brand name for filtering
          sound_file_url: string // Path to uploaded audio file
          description: string | null // Sound description (e.g., "V12 naturally aspirated")
          icon: string // Emoji icon for display
          is_electric: boolean // Whether this is an electric vehicle
          is_active: boolean // Whether to show in public section
          display_order: number // Order in the sound section
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['vehicle_sounds']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['vehicle_sounds']['Insert']>
      }
      admin_sessions: {
        Row: {
          id: string
          token: string
          expires_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_sessions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['admin_sessions']['Insert']>
      }
      site_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['site_settings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['site_settings']['Insert']>
      }
      inventory_snapshots: {
        Row: {
          id: string
          source: string
          payload: Json
          vehicle_count: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventory_snapshots']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['inventory_snapshots']['Insert']>
      }
      admin_users: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'gerente'
          name: string | null
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>
      }
      // Marketing Tables
      marketing_strategies: {
        Row: {
          id: string
          name: string
          description: string | null
          category: MarketingCategory
          status: StrategyStatus
          budget: number | null
          start_date: string | null
          end_date: string | null
          goals: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['marketing_strategies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['marketing_strategies']['Insert']>
      }
      marketing_tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          strategy_id: string | null
          category: MarketingCategory
          status: TaskStatus
          priority: TaskPriority
          due_date: string | null
          estimated_hours: number | null
          actual_hours: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['marketing_tasks']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['marketing_tasks']['Insert']>
      }
      task_assignments: {
        Row: {
          id: string
          task_id: string
          user_id: string
          assigned_by: string | null
          assigned_at: string
        }
        Insert: Omit<Database['public']['Tables']['task_assignments']['Row'], 'id' | 'assigned_at'>
        Update: Partial<Database['public']['Tables']['task_assignments']['Insert']>
      }
      task_comments: {
        Row: {
          id: string
          task_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['task_comments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['task_comments']['Insert']>
      }
      task_status_history: {
        Row: {
          id: string
          task_id: string
          old_status: TaskStatus | null
          new_status: TaskStatus
          changed_by: string | null
          changed_at: string
        }
        Insert: Omit<Database['public']['Tables']['task_status_history']['Row'], 'id' | 'changed_at'>
        Update: never
      }
      // Marketing Campaigns Tables
      marketing_campaigns: {
        Row: {
          id: string
          name: string
          description: string | null
          status: CampaignStatus
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['marketing_campaigns']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['marketing_campaigns']['Insert']>
      }
      campaign_vehicles: {
        Row: {
          id: string
          campaign_id: string
          vehicle_name: string
          added_date: string | null
          notes: string | null
          display_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['campaign_vehicles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['campaign_vehicles']['Insert']>
      }
      // Newsletter Campaigns
      newsletter_campaigns: {
        Row: {
          id: string
          title: string
          subject: string | null
          featured_image: string | null
          sections: Json
          html_content: string | null
          status: NewsletterCampaignStatus
          scheduled_at: string | null
          sent_at: string | null
          recipient_count: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['newsletter_campaigns']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['newsletter_campaigns']['Insert']>
      }
      // Newsletter Subscribers
      newsletter_subscribers: {
        Row: {
          id: string
          email: string
          name: string | null
          is_active: boolean
          source: string
          subscribed_at: string
          unsubscribed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['newsletter_subscribers']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['newsletter_subscribers']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      vehicle_status: 'available' | 'reserved' | 'sold' | 'highlight'
      origem_cliente: OrigemCliente
      origem_lead: OrigemLead
      interesse_tipo: InteresseTipo
      prioridade_lead: PrioridadeLead
      status_lead: StatusLead
      evento_lead_tipo: EventoLeadTipo
      status_compra: StatusCompra
      status_boleto: StatusBoleto
      forma_cobranca: FormaCobranca
      origem_boleto: OrigemBoleto
      evento_boleto_tipo: EventoBoletoTipo
      etapa_funil: EtapaFunil
      motivo_perda_tipo: MotivoPerdaTipo
    }
  }
}

// Newsletter Enum Types
export type NewsletterCampaignStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled'

// Marketing Enum Types
export type MarketingCategory = 'seo' | 'social_media' | 'content' | 'paid_ads' | 'email' | 'events' | 'partnerships' | 'other'
export type StrategyStatus = 'active' | 'paused' | 'completed' | 'archived'
export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'completed' | 'failed'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type CampaignStatus = 'publicada' | 'encerrada_ganho' | 'encerrada_desempenho'

// CRM Enum Types
export type OrigemCliente = 'site' | 'whatsapp' | 'indicacao' | 'crm_externo'
export type OrigemLead = 'site_chat' | 'whatsapp_ia' | 'instagram_form' | 'crm_externo'
export type InteresseTipo = 'comprar' | 'vender' | 'ambos'
export type PrioridadeLead = 'baixa' | 'media' | 'alta'
export type StatusLead = 'novo' | 'em_atendimento' | 'concluido' | 'perdido' | 'ganho'
export type EventoLeadTipo = 'criado' | 'contato_realizado' | 'retorno_pendente' | 'sem_resposta' | 'ganho' | 'perdido' | 'ligacao' | 'whatsapp' | 'visita' | 'email'
export type StatusCompra = 'ativo' | 'vendido' | 'trocado'
export type StatusBoleto = 'pendente' | 'vencido' | 'pago' | 'cancelado' | 'em_negociacao'
export type FormaCobranca = 'boleto' | 'pix_copia_cola' | 'link_pagamento'
export type OrigemBoleto = 'manual' | 'gateway_x' | 'sistema_y'
export type EventoBoletoTipo = 'criado' | 'enviado' | 'lembranca' | 'pago' | 'cancelado' | 'renegociado'
export type EtapaFunil = 'novo_lead' | 'primeiro_contato' | 'visita_agendada' | 'visita_realizada' | 'proposta_enviada' | 'negociacao' | 'ganho' | 'perdido'
export type MotivoPerdaTipo = 'preco' | 'credito_recusado' | 'comprou_outro_lugar' | 'desistiu' | 'outro'

// Existing Table Types
export type Vehicle = Database['public']['Tables']['vehicles']['Row']
export type Location = Database['public']['Tables']['locations']['Row']
export type BlogPost = Database['public']['Tables']['blog_posts']['Row']
export type BlogCategory = Database['public']['Tables']['blog_categories']['Row']
export type ContactSubmission = Database['public']['Tables']['contact_submissions']['Row']
export type WebhookEvent = Database['public']['Tables']['webhook_events']['Row']
export type VehicleSound = Database['public']['Tables']['vehicle_sounds']['Row']
export type AdminSession = Database['public']['Tables']['admin_sessions']['Row']
export type SiteSetting = Database['public']['Tables']['site_settings']['Row']
export type SiteSettingInsert = Database['public']['Tables']['site_settings']['Insert']
export type SiteSettingUpdate = Database['public']['Tables']['site_settings']['Update']
export type AdminUser = Database['public']['Tables']['admin_users']['Row']

// Marketing Table Types
export type MarketingStrategy = Database['public']['Tables']['marketing_strategies']['Row']
export type MarketingStrategyInsert = Database['public']['Tables']['marketing_strategies']['Insert']
export type MarketingStrategyUpdate = Database['public']['Tables']['marketing_strategies']['Update']
export type MarketingTask = Database['public']['Tables']['marketing_tasks']['Row']
export type MarketingTaskInsert = Database['public']['Tables']['marketing_tasks']['Insert']
export type MarketingTaskUpdate = Database['public']['Tables']['marketing_tasks']['Update']
export type TaskAssignment = Database['public']['Tables']['task_assignments']['Row']
export type TaskAssignmentInsert = Database['public']['Tables']['task_assignments']['Insert']
export type TaskComment = Database['public']['Tables']['task_comments']['Row']
export type TaskCommentInsert = Database['public']['Tables']['task_comments']['Insert']
export type TaskStatusHistory = Database['public']['Tables']['task_status_history']['Row']
export type TaskStatusHistoryInsert = Database['public']['Tables']['task_status_history']['Insert']

// Campaign Table Types
export type MarketingCampaign = Database['public']['Tables']['marketing_campaigns']['Row']
export type MarketingCampaignInsert = Database['public']['Tables']['marketing_campaigns']['Insert']
export type MarketingCampaignUpdate = Database['public']['Tables']['marketing_campaigns']['Update']
export type CampaignVehicle = Database['public']['Tables']['campaign_vehicles']['Row']
export type CampaignVehicleInsert = Database['public']['Tables']['campaign_vehicles']['Insert']

// Extended Campaign Types
export interface CampaignWithVehicles extends MarketingCampaign {
  vehicles: CampaignVehicle[]
}

// Extended Marketing Types
export interface MarketingTaskWithDetails extends MarketingTask {
  strategy?: MarketingStrategy | null
  assignees?: { id: string; email: string; name: string | null }[]
  comments_count?: number
}

// Newsletter Table Types
export type NewsletterCampaign = Database['public']['Tables']['newsletter_campaigns']['Row']
export type NewsletterCampaignInsert = Database['public']['Tables']['newsletter_campaigns']['Insert']
export type NewsletterCampaignUpdate = Database['public']['Tables']['newsletter_campaigns']['Update']
export type NewsletterSubscriber = Database['public']['Tables']['newsletter_subscribers']['Row']
export type NewsletterSubscriberInsert = Database['public']['Tables']['newsletter_subscribers']['Insert']
export type NewsletterSubscriberUpdate = Database['public']['Tables']['newsletter_subscribers']['Update']


// =====================================================
// VISITOR INTELLIGENCE TYPES
// =====================================================

export type IdentityEventType =
  | 'email_captured'
  | 'phone_captured'
  | 'url_param_captured'
  | 'form_submitted'
  | 'whatsapp_clicked'
  | 'enrichment_success'
  | 'enrichment_failed'
  | 'profile_merged'
  | 'lead_created'

export type VisitorProfileStatus = 'anonymous' | 'identified' | 'enriched' | 'converted'

export type PageType = 'home' | 'vehicle' | 'vehicles' | 'blog' | 'contact' | 'about' | 'other'

export interface VisitorFingerprint {
  id: string
  visitor_id: string
  browser_name: string | null
  browser_version: string | null
  os_name: string | null
  os_version: string | null
  device_type: string | null
  screen_resolution: string | null
  timezone: string | null
  language: string | null
  confidence_score: number | null
  first_seen_at: string
  last_seen_at: string
  total_visits: number
  resolved_profile_id: string | null
  is_bot: boolean
  created_at: string
  updated_at: string
}

export interface VisitorSession {
  id: string
  fingerprint_id: string
  session_id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  referrer_url: string | null
  referrer_domain: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  ip_address: string | null
  country_code: string | null
  region: string | null
  city: string | null
  gclid: string | null
  fbclid: string | null
  ttclid: string | null
  last_activity_at: string | null
  page_views_count: number
  vehicles_viewed: number
  contacted_whatsapp: boolean
  submitted_form: boolean
  used_calculator: boolean
  created_at: string
}

export interface VisitorPageView {
  id: string
  session_id: string
  fingerprint_id: string
  page_url: string
  page_path: string
  page_title: string | null
  page_type: PageType | null
  vehicle_id: string | null
  vehicle_slug: string | null
  vehicle_brand: string | null
  vehicle_model: string | null
  vehicle_price: number | null
  time_on_page_seconds: number | null
  scroll_depth_percent: number | null
  clicked_whatsapp: boolean
  clicked_phone: boolean
  clicked_form: boolean
  played_engine_sound: boolean
  viewed_at: string
  metadata: Record<string, unknown> | null
  event_id: string | null
}

export interface VisitorProfile {
  id: string
  email: string | null
  phone: string | null
  cpf_hash: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  company_name: string | null
  company_domain: string | null
  company_industry: string | null
  company_size: string | null
  job_title: string | null
  linkedin_url: string | null
  enrichment_source: string | null
  enrichment_data: Record<string, unknown>
  enriched_at: string | null
  lead_score: number
  engagement_score: number
  status: VisitorProfileStatus
  converted_to_lead_id: string | null
  consent_marketing: boolean
  consent_tracking: boolean
  consent_date: string | null
  created_at: string
  updated_at: string
}

export interface IdentityEvent {
  id: string
  fingerprint_id: string
  profile_id: string | null
  event_type: IdentityEventType
  event_data: Record<string, unknown>
  source: string | null
  created_at: string
}

export interface IpGeolocationCache {
  ip_address: string
  country_code: string | null
  region: string | null
  city: string | null
  cached_at: string
  expires_at: string
}

export interface IpCompanyCache {
  id: string
  ip_range_start: string
  ip_range_end: string
  company_name: string
  company_domain: string | null
  company_industry: string | null
  company_size: string | null
  company_linkedin: string | null
  source: string
  confidence: number | null
  cached_at: string
  expires_at: string
}

// Extended types with relations
export interface VisitorFingerprintWithDetails extends VisitorFingerprint {
  sessions?: VisitorSession[]
  profile?: VisitorProfile | null
  page_views?: VisitorPageView[]
}

export interface VisitorProfileWithDetails extends VisitorProfile {
  fingerprints?: VisitorFingerprint[]
  identity_events?: IdentityEvent[]
  total_page_views?: number
  total_sessions?: number
  vehicles_interested?: Array<{
    vehicle_id: string
    vehicle_slug: string
    brand: string
    model: string
    view_count: number
  }>
}