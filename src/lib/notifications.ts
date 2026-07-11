import { Resend } from 'resend'
import { WHATSAPP_NUMBER } from './constants'

// Lazy-loaded Resend client instance to avoid build-time errors
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

// Notification email destination
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'faleconosco@attraveiculos.com.br'

// Lista de destinos para notificação de novos leads via WhatsApp.
// Configurável via env ADMIN_WHATSAPP_NUMBERS (csv, somente dígitos com DDI).
// Default: número comercial + número pessoal do responsável.
const ADMIN_WHATSAPP_NUMBERS: string[] = (() => {
  const envList = process.env.ADMIN_WHATSAPP_NUMBERS
  if (envList) {
    return envList.split(',').map(n => n.trim()).filter(Boolean)
  }
  return [WHATSAPP_NUMBER, '5534991304735']
})()

// Email notification types
export type NotificationType = 
  | 'contact_form'
  | 'lead_magnet'
  | 'vehicle_alert'
  | 'vehicle_inquiry'
  | 'financing_inquiry'
  | 'trade_in_inquiry'
  | 'general_inquiry'

// Base notification data structure
export interface NotificationData {
  type: NotificationType
  senderName: string
  senderEmail: string
  senderPhone?: string
  subject?: string
  message?: string
  sourcePage?: string
  metadata?: Record<string, unknown>
  timestamp?: string
}

// Email send result
export interface EmailResult {
  success: boolean
  emailId?: string
  error?: string
}

// WhatsApp notification result
export interface WhatsAppNotificationResult {
  success: boolean
  error?: string
}

// Combined notification result
export interface NotificationResult {
  email: EmailResult
  avisa: WhatsAppNotificationResult
}

/**
 * Generates email HTML template based on notification type
 */
function generateEmailTemplate(data: NotificationData): string {
  const timestamp = data.timestamp || new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  
  const typeLabels: Record<NotificationType, string> = {
    contact_form: '📩 Formulário de Contato',
    lead_magnet: '📚 Download de Material',
    vehicle_alert: '🔔 Alerta de Veículos',
    vehicle_inquiry: '🚗 Interesse em Veículo',
    financing_inquiry: '💳 Consulta de Financiamento',
    trade_in_inquiry: '🔄 Avaliação de Troca',
    general_inquiry: '💬 Consulta Geral',
  }

  const typeLabel = typeLabels[data.type] || '📬 Nova Notificação'
  
  // Build metadata section if present
  let metadataHtml = ''
  if (data.metadata && Object.keys(data.metadata).length > 0) {
    metadataHtml = `
      <tr>
        <td style="padding: 20px 0 10px 0; border-top: 1px solid #eee;">
          <strong style="color: #333;">Informações Adicionais:</strong>
        </td>
      </tr>
      ${Object.entries(data.metadata).map(([key, value]) => `
        <tr>
          <td style="padding: 5px 0; color: #666;">
            <strong>${formatMetadataKey(key)}:</strong> ${value}
          </td>
        </tr>
      `).join('')}
    `
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${typeLabel}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #C9A55C; margin: 0; font-size: 24px;">${typeLabel}</h1>
    <p style="color: #ccc; margin: 10px 0 0 0; font-size: 14px;">Attra Veículos - Nova Notificação</p>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-top: none;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0;">
          <strong style="color: #333;">Nome:</strong>
          <span style="color: #666; margin-left: 10px;">${data.senderName}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0;">
          <strong style="color: #333;">E-mail:</strong>
          <a href="mailto:${data.senderEmail}" style="color: #C9A55C; margin-left: 10px;">${data.senderEmail}</a>
        </td>
      </tr>
      ${data.senderPhone ? `
      <tr>
        <td style="padding: 10px 0;">
          <strong style="color: #333;">Telefone:</strong>
          <a href="tel:${data.senderPhone}" style="color: #C9A55C; margin-left: 10px;">${data.senderPhone}</a>
        </td>
      </tr>
      ` : ''}
      ${data.subject ? `
      <tr>
        <td style="padding: 10px 0;">
          <strong style="color: #333;">Assunto:</strong>
          <span style="color: #666; margin-left: 10px;">${data.subject}</span>
        </td>
      </tr>
      ` : ''}
      ${data.message ? `
      <tr>
        <td style="padding: 20px 0 10px 0; border-top: 1px solid #eee;">
          <strong style="color: #333;">Mensagem:</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; background: #f9f9f9; border-radius: 8px; color: #555;">
          ${data.message.replace(/\n/g, '<br>')}
        </td>
      </tr>
      ` : ''}
      ${metadataHtml}
    </table>
  </div>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
    <p style="margin: 0; color: #888; font-size: 12px;">
      📍 Origem: ${data.sourcePage || 'Site'} | 🕐 ${timestamp}
    </p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Formats metadata keys for display
 */
function formatMetadataKey(key: string): string {
  const keyMap: Record<string, string> = {
    vehicleValue: 'Valor do Veículo',
    downPayment: 'Entrada',
    installments: 'Parcelas',
    brand: 'Marca',
    model: 'Modelo',
    year: 'Ano',
    mileage: 'Quilometragem',
    condition: 'Condição',
    yearMin: 'Ano Mínimo',
    yearMax: 'Ano Máximo',
    budgetMax: 'Orçamento Máximo',
    details: 'Detalhes',
    brands: 'Marcas de Interesse',
  }
  return keyMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
}

/**
 * Generates email subject based on notification type
 */
function generateEmailSubject(data: NotificationData): string {
  const typeSubjects: Record<NotificationType, string> = {
    contact_form: `📩 Contato: ${data.subject || 'Novo contato via site'}`,
    lead_magnet: `📚 Download: ${data.senderName} baixou material`,
    vehicle_alert: `🔔 Alerta: ${data.senderName} ativou alertas de veículos`,
    vehicle_inquiry: `🚗 Interesse: ${data.senderName} quer saber sobre veículo`,
    financing_inquiry: `💳 Financiamento: Consulta de ${data.senderName}`,
    trade_in_inquiry: `🔄 Troca: ${data.senderName} quer avaliar veículo`,
    general_inquiry: `💬 Consulta: ${data.senderName}`,
  }
  return typeSubjects[data.type] || `Nova notificação: ${data.senderName}`
}

/**
 * Sends email notification via Resend API
 */
export async function sendEmailNotification(data: NotificationData): Promise<EmailResult> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not configured, skipping email')
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    const subject = generateEmailSubject(data)
    const html = generateEmailTemplate(data)
    const timestamp = data.timestamp || new Date().toISOString()

    console.log(`[Email] Sending ${data.type} notification to ${NOTIFICATION_EMAIL}`)

    const { data: result, error } = await getResendClient().emails.send({
      from: 'Attra Veículos <notificacoes@attraveiculos.com.br>',
      to: [NOTIFICATION_EMAIL],
      replyTo: data.senderEmail,
      subject,
      html,
      tags: [
        { name: 'type', value: data.type },
        { name: 'source', value: data.sourcePage || 'unknown' },
      ],
    })

    if (error) {
      console.error('[Email] Resend error:', error)
      return { success: false, error: error.message }
    }

    console.log(`[Email] Successfully sent, ID: ${result?.id}`)
    return { success: true, emailId: result?.id }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Email] Error sending notification:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Sends WhatsApp notification via Avisa API directly to the store's
 * WhatsApp number(s). Canal independente — não depende de Resend nem
 * de sistema externo. Garantia mínima de captura quando os outros
 * canais falham silenciosamente (auth, rate limit, downtime).
 *
 * Configuração (envs no .env.production):
 *   AVISA_API_TOKEN     — token Bearer da instância de ENVIO (ex: Lorrayne)
 *   AVISA_API_URL       — base URL (default: https://www.avisaapi.com.br/api)
 *   AVISA_TARGET_PHONES — números destinatários csv com DDI
 *                         (ex: "5534999999999,5534988888888" — número do
 *                         WhatsApp que está conectado à instância Attra-SDR
 *                         + outros responsáveis)
 *
 * Endpoint: POST {AVISA_API_URL}/actions/sendMessage
 * Body: { number, message }
 * Doc: https://www.avisaapi.com.br/
 */
const AVISA_API_URL = process.env.AVISA_API_URL || 'https://www.avisaapi.com.br/api'

const AVISA_TARGET_PHONES: string[] = (() => {
  const envList = process.env.AVISA_TARGET_PHONES
  if (envList) {
    return envList.split(',').map(n => n.trim()).filter(Boolean)
  }
  // Sem envs configuradas: usa o mesmo destino de ADMIN_WHATSAPP_NUMBERS
  return ADMIN_WHATSAPP_NUMBERS
})()

function buildAvisaMessage(data: NotificationData): string {
  const localTimestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const typeLabels: Record<NotificationType, string> = {
    contact_form: 'Formulário de Contato',
    lead_magnet: 'Download de Material',
    vehicle_alert: 'Alerta de Veículos',
    vehicle_inquiry: 'Interesse em Veículo',
    financing_inquiry: 'Consulta de Financiamento',
    trade_in_inquiry: 'Avaliação de Troca',
    general_inquiry: 'Consulta Geral',
  }

  const lines: string[] = []
  lines.push(`*Novo lead — ${typeLabels[data.type] || data.type}*`)
  lines.push('')
  lines.push(`👤 *Nome:* ${data.senderName}`)
  if (data.senderPhone) lines.push(`📱 *WhatsApp:* ${data.senderPhone}`)
  if (data.senderEmail) lines.push(`✉️ *Email:* ${data.senderEmail}`)
  if (data.subject) lines.push(`📌 *Assunto:* ${data.subject}`)
  if (data.message) lines.push(`💬 *Mensagem:* ${data.message}`)

  if (data.metadata && Object.keys(data.metadata).length > 0) {
    lines.push('')
    lines.push('*Informações adicionais:*')
    for (const [key, value] of Object.entries(data.metadata)) {
      lines.push(`• ${formatMetadataKey(key)}: ${value}`)
    }
  }

  lines.push('')
  if (data.sourcePage) lines.push(`🔗 Origem: ${data.sourcePage}`)
  lines.push(`🕒 ${localTimestamp}`)
  return lines.join('\n')
}

export async function sendAvisaWhatsApp(data: NotificationData): Promise<WhatsAppNotificationResult> {
  try {
    const token = process.env.AVISA_API_TOKEN
    if (!token) {
      console.warn('[Avisa] AVISA_API_TOKEN not configured, skipping')
      return { success: false, error: 'AVISA_API_TOKEN not configured' }
    }

    const message = buildAvisaMessage(data)
    const endpoint = `${AVISA_API_URL.replace(/\/$/, '')}/actions/sendMessage`

    console.log(`[Avisa] Sending lead notification to ${AVISA_TARGET_PHONES.length} number(s)`)

    // Dispara em paralelo para todos os números configurados. Considera
    // sucesso se ao menos um POST chegou ao destino.
    const results = await Promise.all(
      AVISA_TARGET_PHONES.map(async (number) => {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ number, message }),
          })

          if (!response.ok) {
            const text = await response.text().catch(() => '')
            console.error(`[Avisa] HTTP ${response.status} for ${number}: ${text.slice(0, 200)}`)
            return false
          }
          return true
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[Avisa] fetch failed for ${number}: ${msg}`)
          return false
        }
      })
    )

    const anySuccess = results.some(Boolean)
    if (!anySuccess) {
      return { success: false, error: 'All Avisa endpoints failed' }
    }

    console.log('[Avisa] Notification dispatched. Results:', results)
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Avisa] Error sending notification:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Sends email and WhatsApp notifications (Resend + Avisa).
 * Os 2 canais disparam em paralelo. Avisa é a "linha-base garantida" que
 * leva o lead direto pro WhatsApp da loja, mesmo que o email falhe.
 */
export async function sendNotification(data: NotificationData): Promise<NotificationResult> {
  // Add timestamp if not present
  const notificationData: NotificationData = {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  }

  // Dispara os canais em paralelo — falha em um não bloqueia o outro.
  const [emailResult, avisaResult] = await Promise.all([
    sendEmailNotification(notificationData),
    sendAvisaWhatsApp(notificationData),
  ])

  console.log(
    `[Notification] Complete — Email: ${emailResult.success}, Avisa: ${avisaResult.success}`
  )

  return {
    email: emailResult,
    avisa: avisaResult,
  }
}

/**
 * Logs notification event for monitoring
 */
export function logNotificationEvent(
  type: NotificationType,
  success: boolean,
  details: Record<string, unknown>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    success,
    ...details,
  }

  if (success) {
    console.log('[Notification Event]', JSON.stringify(logEntry))
  } else {
    console.error('[Notification Event - Failed]', JSON.stringify(logEntry))
  }
}

