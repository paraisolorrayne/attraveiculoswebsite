'use client'

import { getWhatsAppUrl } from '@/lib/constants'

/**
 * Aviso exibido quando o envio do formulário não chegou a ninguém.
 *
 * Existe porque o site passou de 12/02/2026 a 03/08/2026 dizendo "enviado com
 * sucesso" enquanto nenhuma notificação de lead saía: os formulários
 * descartavam a resposta da API e a API respondia 200 mesmo com todos os
 * canais falhando. Agora a falha aparece — e oferece o WhatsApp, que não
 * depende da mesma cadeia que acabou de falhar.
 */
export function FormErrorFallback({ mensagem }: { mensagem?: string }) {
  return (
    <div
      role="alert"
      className="bg-red-500/10 border border-red-500 rounded-xl p-4 mt-4 text-center"
    >
      <p className="text-red-600 dark:text-red-400 font-medium">
        {mensagem || 'Não conseguimos registrar seu contato agora.'}
      </p>
      <p className="text-foreground-secondary text-sm mt-2">
        Tente de novo em instantes ou fale com a gente pelo{' '}
        <a
          href={getWhatsAppUrl('Olá! Tentei enviar o formulário do site e não consegui.')}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium"
        >
          WhatsApp
        </a>
        .
      </p>
    </div>
  )
}
