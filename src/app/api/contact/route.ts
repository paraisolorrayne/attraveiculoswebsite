import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendNotification, logNotificationEvent, NotificationType } from '@/lib/notifications'
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'
import { classifyLeadSource, fonteLabels } from '@/lib/lead-source'
import { sendFykosLead } from '@/lib/fykos'

const trafficSchema = z.object({
  utmSource:   z.string().optional(),
  utmMedium:   z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent:  z.string().optional(),
  utmTerm:     z.string().optional(),
  utmId:       z.string().optional(),  // GA4 Campaign ID (utm_id)
  adsetId:     z.string().optional(),  // Meta adset / Google ad_group
  adId:        z.string().optional(),  // Meta ad / Google creative
  gclid:       z.string().optional(),
  fbclid:      z.string().optional(),
  ttclid:      z.string().optional(),
  referrer:    z.string().optional(),
  landingPage: z.string().optional(),
}).partial().optional()

const contactSchema = z.object({
  name: z.string().min(3),
  // Email is optional — short lead-capture forms (WhatsApp-first) may omit it
  email: z.string().email().optional().or(z.literal('')),
  // Phone é opcional no servidor (guia grátis / exit-intent / alertas não
  // exigem); cada formulário valida a própria obrigatoriedade no client
  phone: z.string().optional().or(z.literal('')),
  subject: z.string().optional(),
  message: z.string().optional(),
  sourcePage: z.string().optional(),
  formType: z.string().optional(), // To specify the type of form
  // Atribuição de mídia (UTM + click IDs)
  traffic: trafficSchema,
  // Additional fields for specific forms
  vehicleValue: z.string().optional(),
  downPayment: z.string().optional(),
  installments: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional(),
  mileage: z.string().optional(),
  condition: z.string().optional(),
  yearMin: z.string().optional(),
  yearMax: z.string().optional(),
  budgetMax: z.string().optional(),
  details: z.string().optional(),
  // ID de sessão do tracking (attra_session_id) — correlaciona o lead no
  // Fykos com a navegação do visitante no site
  sessionId: z.string().optional(),
})

// Map form types to notification types
function getNotificationType(formType?: string, sourcePage?: string): NotificationType {
  if (formType) {
    const typeMap: Record<string, NotificationType> = {
      'contact': 'contact_form',
      'lead_magnet': 'lead_magnet',
      'vehicle_alert': 'vehicle_alert',
      'vehicle_inquiry': 'vehicle_inquiry',
      'financing': 'financing_inquiry',
      'trade_in': 'trade_in_inquiry',
      'general': 'general_inquiry',
    }
    return typeMap[formType] || 'contact_form'
  }

  // Infer from source page if formType not provided
  if (sourcePage) {
    if (sourcePage.includes('financiamento')) return 'financing_inquiry'
    if (sourcePage.includes('vender') || sourcePage.includes('troca')) return 'trade_in_inquiry'
    if (sourcePage.includes('veiculo') || sourcePage.includes('estoque') || sourcePage.includes('veiculos')) return 'vehicle_inquiry'
    if (sourcePage.includes('lead_magnet') || sourcePage.includes('guia')) return 'lead_magnet'
    if (sourcePage.includes('alerta')) return 'vehicle_alert'
  }

  return 'contact_form'
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for form submissions
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_PRESETS.form)

    if (!rateLimitResult.success) {
      console.warn(`[Contact API] Rate limit exceeded for IP: ${clientIP}`)
      return NextResponse.json(
        {
          success: false,
          error: 'Muitas requisições. Aguarde um momento antes de enviar novamente.'
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
          }
        }
      )
    }

    const body = await request.json()
    const data = contactSchema.parse(body)

    console.log('[Contact API] Form submission received:', data.name, data.email)

    // Determine notification type
    const notificationType = getNotificationType(data.formType, data.sourcePage)

    // Build metadata from additional fields
    const metadata: Record<string, unknown> = {}
    if (data.vehicleValue) metadata.vehicleValue = data.vehicleValue
    if (data.downPayment) metadata.downPayment = data.downPayment
    if (data.installments) metadata.installments = data.installments
    if (data.brand) metadata.brand = data.brand
    if (data.model) metadata.model = data.model
    if (data.year) metadata.year = data.year
    if (data.mileage) metadata.mileage = data.mileage
    if (data.condition) metadata.condition = data.condition
    if (data.yearMin) metadata.yearMin = data.yearMin
    if (data.yearMax) metadata.yearMax = data.yearMax
    if (data.budgetMax) metadata.budgetMax = data.budgetMax
    if (data.details) metadata.details = data.details

    // Send email and WhatsApp notifications
    const notificationResult = await sendNotification({
      type: notificationType,
      senderName: data.name,
      senderEmail: data.email || '',
      senderPhone: data.phone,
      subject: data.subject,
      message: data.message,
      sourcePage: data.sourcePage,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    })

    // Log notification event for monitoring. Considera o lead capturado
    // se ao menos UM dos canais funcionou (email, avisa).
    const anyChannelSuccess =
      notificationResult.email.success ||
      notificationResult.avisa.success
    logNotificationEvent(notificationType, anyChannelSuccess, {
      email: notificationResult.email,
      avisa: notificationResult.avisa,
      senderEmail: data.email,
      sourcePage: data.sourcePage,
    })

    // Classificação de fonte (Google Ads / Meta Ads / Orgânico / ...) a partir do traffic
    const fonte = classifyLeadSource({
      utm_source: data.traffic?.utmSource,
      utm_medium: data.traffic?.utmMedium,
      gclid:      data.traffic?.gclid,
      fbclid:     data.traffic?.fbclid,
      ttclid:     data.traffic?.ttclid,
      referrer:   data.traffic?.referrer,
    })
    console.log('[Contact API] Lead source:', fonte)

    // Envia o lead pro CRM Fykos (falha não bloqueia a resposta — email e
    // Avisa acima são os canais garantidos de captura). Só vai pro Fykos
    // com telefone: sem ele não há como a loja iniciar o atendimento.
    const hasPhone = Boolean(data.phone?.replace(/\D/g, ''))
    const fykosResult = hasPhone
      ? await sendFykosLead({
          name: data.name,
          email: data.email,
          phone: data.phone!,
          message: data.message,
          brand: data.brand,
          model: data.model,
          year: data.year,
          mileage: data.mileage,
          vehicleValue: data.vehicleValue,
          sessionId: data.sessionId,
          // Atribuição: leva campanha/termo/gclid pro CRM (antes era descartada)
          traffic: data.traffic,
          leadSource: fonteLabels[fonte],
        })
      : { success: false, error: 'sem telefone — não enviado ao Fykos' }

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso!',
      notifications: {
        email: notificationResult.email.success,
        avisa: notificationResult.avisa.success,
        fykos: fykosResult.success,
      }
    })
  } catch (error) {
    console.error('[Contact API] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Dados inválidos', errors: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Erro ao enviar mensagem' },
      { status: 500 }
    )
  }
}

