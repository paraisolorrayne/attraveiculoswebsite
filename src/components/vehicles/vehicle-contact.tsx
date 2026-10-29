'use client'

import { MessageCircle, Phone, Mail, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Vehicle } from '@/types'
import { getWhatsAppUrl, PHONE_NUMBER } from '@/lib/constants'
import { mensagemWhatsAppDoVeiculo } from '@/lib/mensagem-whatsapp-veiculo'

interface VehicleContactProps {
  vehicle: Vehicle
  compact?: boolean
}

export function VehicleContact({ vehicle, compact = false }: VehicleContactProps) {
  const isSold = vehicle.status === 'sold'

  const whatsappUrl = getWhatsAppUrl(mensagemWhatsAppDoVeiculo(vehicle))

  // Compact mode for sidebar
  if (compact) {
    return (
      <div className="space-y-3">
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button
            className="w-full bg-primary hover:bg-primary-hover text-white"
            size="lg"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Falar com consultor
          </Button>
        </a>
        <div className="flex gap-2">
          <a
            href={`tel:${PHONE_NUMBER}`}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-background border border-border rounded-lg text-foreground hover:bg-background-soft transition-colors text-sm"
          >
            <Phone className="w-4 h-4" />
            Ligar
          </a>
          <a
            href={`/financiamento?veiculo=${vehicle.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-background border border-border rounded-lg text-foreground hover:bg-background-soft transition-colors text-sm"
          >
            <FileText className="w-4 h-4" />
            Financiar
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {isSold ? 'Buscar veículo similar' : 'Interessado?'}
      </h2>

      <div className="space-y-3">
        {/* WhatsApp CTA */}
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button
            className="w-full bg-green-500 hover:bg-green-600 text-white"
            size="lg"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            {isSold ? 'Buscar similar no WhatsApp' : 'Falar no WhatsApp'}
          </Button>
        </a>

        {/* Phone */}
        <a
          href={`tel:${PHONE_NUMBER}`}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-background border border-border rounded-lg text-foreground hover:bg-background-soft transition-colors"
        >
          <Phone className="w-5 h-5" />
          Ligar agora
        </a>

        {/* Email */}
        <a
          href={`mailto:faleconosco@attraveiculos.com.br?subject=Interesse: ${vehicle.brand} ${vehicle.model} ${vehicle.year_model}`}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-background border border-border rounded-lg text-foreground hover:bg-background-soft transition-colors"
        >
          <Mail className="w-5 h-5" />
          Enviar e-mail
        </a>

        {/* Financing */}
        {!isSold && (
          <a
            href={`/financiamento?veiculo=${vehicle.id}`}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-background border border-border rounded-lg text-foreground hover:bg-background-soft transition-colors"
          >
            <FileText className="w-5 h-5" />
            Simular financiamento
          </a>
        )}
      </div>

      {/* Trust badges */}
      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-xs text-foreground-secondary text-center">
          ✓ Veículo verificado • ✓ Documentação em dia • ✓ Garantia de procedência
        </p>
      </div>
    </div>
  )
}

