import { supabase } from '@/lib/supabase/tracking-client'

// Integração com o CRM Fykos: um POST por lead novo capturado nos
// formulários do site, no mesmo formato dos leads Webmotors/iCarros
// (diferenciados pelo campo `origem`).
//
// Endpoint configurável via FYKOS_WEBHOOK_URL; sem a env usa o padrão.
const FYKOS_WEBHOOK_URL =
  process.env.FYKOS_WEBHOOK_URL || 'https://app.fykos.com.br/webhooks/webmotors'

export interface FykosLeadInput {
  name: string
  email?: string
  phone: string
  message?: string
  // Campos de veículo vindos dos formulários (troca, financiamento, busca)
  brand?: string
  model?: string
  year?: string
  mileage?: string
  vehicleValue?: string
  // ID de sessão do tracking do browser (attra_session_id) — usado para
  // resolver lead_id e, na ausência de veículo no formulário, buscar os
  // veículos visitados na sessão.
  sessionId?: string
}

interface FykosVehicle {
  vehicle_type: string
  brand: string | null
  model: string | null
  version: string | null
  year: string | null
  fabric_year: string | null
  plate: string | null
  km: number | null
  price: number | null
  condition: string
  simulations: never[]
}

// "AAAA-MM-DD HH:MM:SS" no fuso da loja
function nowSaoPaulo(): string {
  return new Date()
    .toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo', hour12: false })
    .replace('T', ' ')
}

function onlyDigits(value?: string): string | null {
  const digits = (value || '').replace(/\D/g, '')
  return digits || null
}

function toInt(value?: string | number | null): number | null {
  if (value === null || value === undefined) return null
  const digits = String(value).replace(/\D/g, '')
  if (!digits) return null
  return parseInt(digits, 10)
}

// brand = primeira palavra, model = o resto (regra do payload Fykos)
function splitVehicleName(full: string): { brand: string; model: string | null } {
  const parts = full.trim().split(/\s+/)
  return { brand: parts[0], model: parts.slice(1).join(' ') || null }
}

/**
 * Resolve dados da sessão de tracking: id do registro em visitor_sessions
 * (vira lead_id) e, se necessário, o último veículo visitado na sessão.
 */
async function lookupSession(sessionId: string, needVehicle: boolean): Promise<{
  sessionDbId: string | null
  vehicle: FykosVehicle | null
}> {
  try {
    const { data: session } = await supabase
      .from('visitor_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .single()

    if (!session?.id) return { sessionDbId: null, vehicle: null }
    if (!needVehicle) return { sessionDbId: session.id, vehicle: null }

    const { data: views } = await supabase
      .from('visitor_page_views')
      .select('vehicle_brand, vehicle_model, vehicle_slug, viewed_at')
      .eq('session_id', session.id)
      .not('vehicle_slug', 'is', null)
      .order('viewed_at', { ascending: false })
      .limit(1)

    const view = views?.[0]
    if (!view) return { sessionDbId: session.id, vehicle: null }

    return {
      sessionDbId: session.id,
      vehicle: {
        vehicle_type: 'Carros',
        brand: view.vehicle_brand || null,
        model: view.vehicle_model || null,
        version: null,
        year: null,
        fabric_year: null,
        plate: null,
        km: null,
        price: null,
        condition: 'usado',
        simulations: [],
      },
    }
  } catch (err) {
    console.error('[Fykos] Session lookup error:', err)
    return { sessionDbId: null, vehicle: null }
  }
}

function buildFormVehicle(input: FykosLeadInput): FykosVehicle | null {
  if (!input.brand && !input.model) return null

  let brand = input.brand?.trim() || null
  let model = input.model?.trim() || null
  // Formulários que mandam o veículo inteiro num campo só: brand = primeira
  // palavra, model = o resto.
  if (brand && !model) {
    const split = splitVehicleName(brand)
    brand = split.brand
    model = split.model
  }

  return {
    vehicle_type: 'Carros',
    brand,
    model,
    version: null,
    year: input.year?.trim() || null,
    fabric_year: null,
    plate: null,
    km: toInt(input.mileage),
    price: toInt(input.vehicleValue),
    condition: 'usado',
    simulations: [],
  }
}

/**
 * Envia um lead de formulário do site para o Fykos. Nunca lança — falha é
 * logada e o fluxo do formulário segue (email/Avisa são os canais garantidos).
 */
export async function sendFykosLead(input: FykosLeadInput): Promise<{ success: boolean; error?: string }> {
  try {
    const createAt = nowSaoPaulo()
    const message = input.message?.trim() || null

    // Veículo de interesse: campos do formulário primeiro; sem eles,
    // busca as páginas de veículo que a sessão visitou no site.
    const formVehicle = buildFormVehicle(input)
    const { sessionDbId, vehicle: visitedVehicle } = input.sessionId
      ? await lookupSession(input.sessionId, !formVehicle)
      : { sessionDbId: null, vehicle: null }

    const interestedVehicle = formVehicle || visitedVehicle

    const payload = {
      type: 'Novo Atendimento',
      origem: 'Formulario Site',
      create_at: createAt,
      visited: null,
      reason: null,
      store: null,
      creates_rescue_lead: null,
      lead_id: sessionDbId,
      codigo_lead: null,
      cockpit_url: null,
      user_res: null,
      user_email: null,
      name: input.name,
      email: input.email?.trim() || null,
      cpf: null,
      mobile_phone: onlyDigits(input.phone),
      phone: onlyDigits(input.phone),
      message,
      conversation: message
        ? [{ datetime: createAt, author: 'cliente', author_name: input.name, text: message }]
        : [],
      conversation_text: message
        ? `[${createAt.slice(0, 16)}] ${input.name} (cliente): ${message}`
        : null,
      negotiation_type: null,
      negotiation_type_slug: null,
      interested_in_vehicle: interestedVehicle ? [interestedVehicle] : [],
      evaluated_vehicles: [],
      origins: [],
    }

    console.log('[Fykos] Sending lead:', input.name, interestedVehicle?.brand || 'sem veículo')

    const response = await fetch(FYKOS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error('[Fykos] Webhook error:', response.status, text.slice(0, 200))
      return { success: false, error: `HTTP ${response.status}` }
    }

    console.log('[Fykos] Lead sent successfully')
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Fykos] Error sending lead:', msg)
    return { success: false, error: msg }
  }
}
