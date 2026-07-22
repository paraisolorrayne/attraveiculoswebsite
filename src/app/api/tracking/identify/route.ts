import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import type { Updateable } from 'kysely'
import { db } from '@/lib/db'
import type { Database } from '@/lib/db/types'
import { createHash } from 'crypto'
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

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
      cpf,              // Optional: CPF será hasheado antes de gravar (LGPD)
      consent_given,    // Optional: consentimento explícito do checkbox
    } = body

    if (!fingerprint_db_id) {
      return NextResponse.json({ error: 'Missing fingerprint_db_id' }, { status: 400 })
    }

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone required' }, { status: 400 })
    }

    // Procura perfil existente por email ou telefone
    let existingProfile = email
      ? await db.selectFrom('visitor_profiles').selectAll()
          .where('email', '=', email.toLowerCase()).executeTakeFirst()
      : undefined

    if (!existingProfile && phone) {
      const cleanPhone = phone.replace(/\D/g, '')
      existingProfile = await db.selectFrom('visitor_profiles').selectAll()
        .where('phone', '=', cleanPhone).executeTakeFirst()
    }

    let profileId: string

    // Hash do CPF (LGPD: nunca gravar CPF em claro)
    const cpfHash = cpf ? hashCPF(cpf) : null
    const now = new Date()

    if (existingProfile) {
      // Atualiza perfil existente
      profileId = existingProfile.id

      const updates: Updateable<Database['visitor_profiles']> = {
        status: 'identified',
        updated_at: now,
      }

      if (email && !existingProfile.email) updates.email = email.toLowerCase()
      if (phone && !existingProfile.phone) updates.phone = phone.replace(/\D/g, '')
      if (name) {
        updates.full_name = name
        const nameParts = name.split(' ')
        updates.first_name = nameParts[0]
        updates.last_name = nameParts.slice(1).join(' ') || null
      }
      if (cpfHash && !existingProfile.cpf_hash) updates.cpf_hash = cpfHash

      // LGPD: registra consentimento explícito, se dado
      if (consent_given) {
        updates.consent_given = true
        updates.consent_given_at = now
        updates.consent_marketing = true
        updates.consent_date = now
      }

      // Base legal para submissões de formulário
      if (!existingProfile.legitimate_interest_basis) {
        updates.legitimate_interest_basis = source === 'form' ? 'explicit_consent' : 'url_param_interaction'
      }

      await db.updateTable('visitor_profiles').set(updates).where('id', '=', profileId).execute()

      // Log do merge
      await db.insertInto('identity_events').values({
        fingerprint_id: fingerprint_db_id,
        profile_id: profileId,
        event_type: 'profile_merged',
        event_data: sql`${JSON.stringify({ source, merged_with_existing: true })}::jsonb`,
        source,
      }).execute()

    } else {
      // Cria perfil novo
      const nameParts = name?.split(' ') || []

      const newProfile = await db.insertInto('visitor_profiles').values({
        email: email?.toLowerCase() || null,
        phone: phone?.replace(/\D/g, '') || null,
        cpf_hash: cpfHash,
        full_name: name || null,
        first_name: nameParts[0] || null,
        last_name: nameParts.slice(1).join(' ') || null,
        status: 'identified',
        // LGPD
        consent_given: consent_given || false,
        consent_given_at: consent_given ? now : null,
        consent_marketing: consent_given || false,
        consent_date: consent_given ? now : null,
        legitimate_interest_basis: source === 'form' ? 'explicit_consent' : 'url_param_interaction',
      }).returning('id').executeTakeFirst()

      if (!newProfile?.id) {
        console.error('[Tracking] Profile insert error')
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      profileId = newProfile.id
    }

    // Liga o fingerprint ao perfil
    await db.updateTable('visitor_fingerprints')
      .set({ resolved_profile_id: profileId })
      .where('id', '=', fingerprint_db_id)
      .execute()

    // Log do identity event
    const eventType = source === 'url_param' ? 'url_param_captured' :
                      email ? 'email_captured' : 'phone_captured'

    await db.insertInto('identity_events').values({
      fingerprint_id: fingerprint_db_id,
      profile_id: profileId,
      event_type: eventType,
      event_data: sql`${JSON.stringify({ email, phone, name })}::jsonb`,
      source,
    }).execute()

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
 * Hash CPF com SHA-256 pra conformidade LGPD. Nunca gravar CPF em claro.
 */
function hashCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '')
  return createHash('sha256').update(cleanCPF).digest('hex')
}
