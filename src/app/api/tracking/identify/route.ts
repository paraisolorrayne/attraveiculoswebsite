import { NextRequest, NextResponse } from 'next/server'
import { supabase } from "@/lib/supabase/tracking-client"
import { createHash } from 'crypto'
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'


// N8N webhook URL and secret for enrichment
const N8N_ENRICHMENT_WEBHOOK = process.env.N8N_ENRICHMENT_WEBHOOK_URL
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_PRESETS.form)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
      )
    }

    const body = await request.json()
    const {
      fingerprint_db_id,
      source,
      email,
      phone,
      name,
      cpf,              // Optional: CPF will be hashed before storage (LGPD)
      consent_given,    // Optional: explicit consent from form checkbox
    } = body

    if (!fingerprint_db_id) {
      return NextResponse.json({ error: 'Missing fingerprint_db_id' }, { status: 400 })
    }

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone required' }, { status: 400 })
    }

    // Check if profile already exists with this email or phone
    let existingProfile = null
    
    if (email) {
      const { data } = await supabase
        .from('visitor_profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .single()
      existingProfile = data
    }
    
    if (!existingProfile && phone) {
      const cleanPhone = phone.replace(/\D/g, '')
      const { data } = await supabase
        .from('visitor_profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .single()
      existingProfile = data
    }

    let profileId: string

    // Hash CPF if provided (LGPD: never store plain text CPF)
    const cpfHash = cpf ? hashCPF(cpf) : null

    if (existingProfile) {
      // Update existing profile
      profileId = existingProfile.id

      const updates: Record<string, unknown> = {
        status: 'identified',
        updated_at: new Date().toISOString(),
      }

      if (email && !existingProfile.email) {
        updates.email = email.toLowerCase()
      }
      if (phone && !existingProfile.phone) {
        updates.phone = phone.replace(/\D/g, '')
      }
      if (name) {
        updates.full_name = name
        const nameParts = name.split(' ')
        updates.first_name = nameParts[0]
        updates.last_name = nameParts.slice(1).join(' ') || null
      }
      if (cpfHash && !existingProfile.cpf_hash) {
        updates.cpf_hash = cpfHash
      }

      // LGPD: Record explicit consent if given
      if (consent_given) {
        updates.consent_given = true
        updates.consent_given_at = new Date().toISOString()
        updates.consent_marketing = true
        updates.consent_date = new Date().toISOString()
      }

      // Set legitimate interest basis for form submissions
      if (!existingProfile.legitimate_interest_basis) {
        updates.legitimate_interest_basis = source === 'form' ? 'explicit_consent' : 'url_param_interaction'
      }

      await supabase
        .from('visitor_profiles')
        .update(updates)
        .eq('id', profileId)

      // Log merge event
      await supabase.from('identity_events').insert({
        fingerprint_id: fingerprint_db_id,
        profile_id: profileId,
        event_type: 'profile_merged',
        event_data: { source, merged_with_existing: true },
        source,
      })

    } else {
      // Create new profile
      const nameParts = name?.split(' ') || []
      
      const { data: newProfile, error: profileError } = await supabase
        .from('visitor_profiles')
        .insert({
          email: email?.toLowerCase() || null,
          phone: phone?.replace(/\D/g, '') || null,
          cpf_hash: cpfHash,
          full_name: name || null,
          first_name: nameParts[0] || null,
          last_name: nameParts.slice(1).join(' ') || null,
          status: 'identified',
          // LGPD fields
          consent_given: consent_given || false,
          consent_given_at: consent_given ? new Date().toISOString() : null,
          consent_marketing: consent_given || false,
          consent_date: consent_given ? new Date().toISOString() : null,
          legitimate_interest_basis: source === 'form' ? 'explicit_consent' : 'url_param_interaction',
        })
        .select('id')
        .single()

      if (profileError) {
        console.error('[Tracking] Profile insert error:', profileError)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      profileId = newProfile.id
    }

    // Link fingerprint to profile
    await supabase
      .from('visitor_fingerprints')
      .update({ resolved_profile_id: profileId })
      .eq('id', fingerprint_db_id)

    // Log identity event
    const eventType = source === 'url_param' ? 'url_param_captured' : 
                      email ? 'email_captured' : 'phone_captured'
    
    await supabase.from('identity_events').insert({
      fingerprint_id: fingerprint_db_id,
      profile_id: profileId,
      event_type: eventType,
      event_data: { email, phone, name },
      source,
    })

    // Trigger N8N enrichment webhook if configured
    if (N8N_ENRICHMENT_WEBHOOK && (email || phone)) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // Add authentication header if secret is configured
      if (N8N_WEBHOOK_SECRET) {
        headers['Authorization'] = `Bearer ${N8N_WEBHOOK_SECRET}`
      }

      fetch(N8N_ENRICHMENT_WEBHOOK, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          profile_id: profileId,
          fingerprint_id: fingerprint_db_id,
          email,
          phone,
          name,
          source,
          timestamp: new Date().toISOString(),
        }),
      }).catch(err => console.error('[Tracking] N8N webhook error:', err))
    }

    return NextResponse.json({ 
      success: true, 
      profile_id: profileId,
      was_merged: !!existingProfile,
    })

  } catch (error) {
    console.error('[Tracking] Identify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Hash CPF using SHA-256 for LGPD compliance.
 * Never store plain text CPF.
 */
function hashCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '') // Remove non-digits
  return createHash('sha256').update(cleanCPF).digest('hex')
}

