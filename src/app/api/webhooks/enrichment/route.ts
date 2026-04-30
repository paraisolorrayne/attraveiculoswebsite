import { NextRequest, NextResponse } from 'next/server'
import { supabase } from "@/lib/supabase/tracking-client"
import { createHash } from 'crypto'


// Webhook secret for authentication
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

/**
 * Webhook endpoint for N8N to send enriched data back
 * Called after N8N processes data from Apollo.io, Snov.io, BigDataCorp, etc.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (mandatory in production)
    const authHeader = request.headers.get('authorization')
    if (!WEBHOOK_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[Enrichment] N8N_WEBHOOK_SECRET not configured in production')
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
      }
    } else if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      profile_id,
      fingerprint_id,
      source, // apollo, clearbit_reveal, snov, bigdata, etc.
      success,
      data, // Enriched data from the provider
      confidence_score, // 0-1 probabilistic confidence (for behavioral enrichment)
      enrichment_type, // 'identity' (email/phone) or 'behavioral' (IP/signals)
    } = body

    if (!profile_id) {
      return NextResponse.json({ error: 'Missing profile_id' }, { status: 400 })
    }

    if (!success) {
      // Log failed enrichment
      await supabase.from('identity_events').insert({
        fingerprint_id,
        profile_id,
        event_type: 'enrichment_failed',
        event_data: { source, error: data?.error || 'Unknown error' },
        source,
      })

      return NextResponse.json({ success: false, message: 'Enrichment failed logged' })
    }

    // Extract and normalize enriched data
    const enrichmentData = normalizeEnrichmentData(source, data)

    // Update profile with enriched data
    const updates: Record<string, unknown> = {
      status: 'enriched',
      enrichment_source: source,
      enrichment_data: data,
      enriched_at: new Date().toISOString(),
    }

    // Set confidence_score if provided (from behavioral enrichment)
    if (typeof confidence_score === 'number' && confidence_score >= 0 && confidence_score <= 1) {
      updates.confidence_score = confidence_score
    }

    // Map normalized fields to profile columns
    if (enrichmentData.company_name) updates.company_name = enrichmentData.company_name
    if (enrichmentData.company_domain) updates.company_domain = enrichmentData.company_domain
    if (enrichmentData.company_industry) updates.company_industry = enrichmentData.company_industry
    if (enrichmentData.company_size) updates.company_size = enrichmentData.company_size
    if (enrichmentData.job_title) updates.job_title = enrichmentData.job_title
    if (enrichmentData.linkedin_url) updates.linkedin_url = enrichmentData.linkedin_url
    if (enrichmentData.full_name && !updates.full_name) updates.full_name = enrichmentData.full_name
    if (enrichmentData.first_name && !updates.first_name) updates.first_name = enrichmentData.first_name
    if (enrichmentData.last_name && !updates.last_name) updates.last_name = enrichmentData.last_name

    // For behavioral enrichment: also store email/phone if returned by data broker
    if (enrichment_type === 'behavioral') {
      if (enrichmentData.email) updates.email = enrichmentData.email
      if (enrichmentData.phone) updates.phone = enrichmentData.phone
    }

    // LGPD: Store hashed CPF if returned by data broker (e.g. BigDataCorp)
    if (enrichmentData.cpf_hash) updates.cpf_hash = enrichmentData.cpf_hash

    // Update profile
    const { error: updateError } = await supabase
      .from('visitor_profiles')
      .update(updates)
      .eq('id', profile_id)

    if (updateError) {
      console.error('[Enrichment] Profile update error:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    // Calculate and update lead score
    const { data: scoreResult } = await supabase.rpc('calculate_lead_score', { p_profile_id: profile_id })

    if (scoreResult !== null) {
      await supabase
        .from('visitor_profiles')
        .update({ lead_score: scoreResult })
        .eq('id', profile_id)
    }

    // Check sales qualification for high-confidence behavioral enrichments
    let salesQualified = false
    if (enrichment_type === 'behavioral' && confidence_score > 0.80) {
      const { data: qualified } = await supabase.rpc('check_sales_qualification', { p_profile_id: profile_id })
      salesQualified = qualified === true
    }

    // Log successful enrichment
    await supabase.from('identity_events').insert({
      fingerprint_id,
      profile_id,
      event_type: 'enrichment_success',
      event_data: { source, fields_enriched: Object.keys(enrichmentData) },
      source,
    })

    return NextResponse.json({
      success: true,
      message: 'Profile enriched successfully',
      lead_score: scoreResult,
      sales_qualified: salesQualified,
      enrichment_type: enrichment_type || 'identity',
    })

  } catch (error) {
    console.error('[Enrichment] Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Normalize data from different enrichment providers to a common format
 */
function normalizeEnrichmentData(source: string, data: Record<string, unknown>): Record<string, string | null> {
  const normalized: Record<string, string | null> = {}

  switch (source) {
    case 'apollo':
      // Apollo.io People Enrichment format (normalized by N8N)
      normalized.company_name = (data.company as Record<string, unknown>)?.name as string || null
      normalized.company_domain = (data.company as Record<string, unknown>)?.domain as string || null
      normalized.company_industry = (data.company as Record<string, unknown>)?.industry as string || null
      normalized.company_size = (data.company as Record<string, unknown>)?.employeesRange as string || null
      normalized.job_title = (data.person as Record<string, unknown>)?.employment?.title as string || null
      // Apollo.io returns full LinkedIn URL (e.g. https://linkedin.com/in/handle)
      normalized.linkedin_url = (data.person as Record<string, unknown>)?.linkedin?.handle as string || null
      normalized.full_name = (data.person as Record<string, unknown>)?.name?.fullName as string || null
      normalized.first_name = (data.person as Record<string, unknown>)?.name?.givenName as string || null
      normalized.last_name = (data.person as Record<string, unknown>)?.name?.familyName as string || null
      break

    case 'snov':
      // Snov.io format
      normalized.company_name = data.company as string || null
      normalized.job_title = data.position as string || null
      normalized.linkedin_url = data.linkedin as string || null
      normalized.full_name = data.name as string || null
      break

    case 'clearbit_reveal':
      // Clearbit Reveal (IP-based company identification)
      normalized.company_name = (data.company as Record<string, unknown>)?.name as string || null
      normalized.company_domain = (data.company as Record<string, unknown>)?.domain as string || null
      normalized.company_industry = (data.company as Record<string, unknown>)?.category?.industry as string || null
      normalized.company_size = (data.company as Record<string, unknown>)?.metrics?.employeesRange as string || null
      // Reveal doesn't return person data, only company
      break

    case 'bigdata':
      // BigDataCorp (Brazilian) format
      normalized.company_name = data.razao_social as string || data.nome_fantasia as string || null
      normalized.full_name = data.nome as string || null
      normalized.email = data.email as string || null
      normalized.phone = data.telefone as string || data.celular as string || null
      // LGPD: Hash CPF before storing (never store plain text)
      if (data.cpf) {
        normalized.cpf_hash = hashCPFFromBroker(data.cpf as string)
      }
      break

    default:
      // Generic mapping - try common field names
      normalized.company_name = data.company_name as string || data.company as string || null
      normalized.company_domain = data.domain as string || null
      normalized.job_title = data.title as string || data.job_title as string || null
      normalized.full_name = data.name as string || data.full_name as string || null
  }

  return normalized
}

/**
 * Hash CPF using SHA-256 for LGPD compliance.
 * Used when data brokers return CPF in enrichment responses.
 * Never store plain text CPF.
 */
function hashCPFFromBroker(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '') // Remove non-digits
  return createHash('sha256').update(cleanCPF).digest('hex')
}
