'use client'

import { useState, useEffect, useRef } from 'react'
import { Calculator, MessageCircle, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getWhatsAppUrl } from '@/lib/constants'
import { useAnalytics } from '@/hooks/use-analytics'
import { useVisitorTracking } from '@/components/providers/visitor-tracking-provider'

interface FinancingCalculatorProps {
  defaultVehicleValue?: number
}

export function FinancingCalculator({ defaultVehicleValue = 500000 }: FinancingCalculatorProps) {
  const [vehicleValue, setVehicleValue] = useState(defaultVehicleValue)
  const [downPayment, setDownPayment] = useState(Math.round(defaultVehicleValue * 0.3))
  const [months, setMonths] = useState(48)
  const [monthlyPayment, setMonthlyPayment] = useState(0)
  const { trackFinancingCalculation, trackWhatsAppClick } = useAnalytics()
  const { getVisitorContext } = useVisitorTracking()
  const lastTrackedRef = useRef<string | null>(null)

  // Premium financing rate (monthly) - estimated 1.49% for luxury vehicles
  const annualRate = 0.1788 // 17.88% annual
  const monthlyRate = annualRate / 12

  useEffect(() => {
    const financedAmount = vehicleValue - downPayment
    if (financedAmount <= 0) {
      setMonthlyPayment(0)
      return
    }

    // PMT formula for loan calculation
    const payment = financedAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                   (Math.pow(1 + monthlyRate, months) - 1)
    setMonthlyPayment(Math.round(payment))

    // Track financing calculation when values change (debounced by tracking key)
    const trackingKey = `${vehicleValue}-${downPayment}-${months}`
    if (lastTrackedRef.current !== trackingKey && financedAmount > 0) {
      // Only track after user interaction (not initial render)
      if (lastTrackedRef.current !== null) {
        const visitorContext = getVisitorContext()
        trackFinancingCalculation({
          vehiclePrice: vehicleValue,
          downPayment,
          installments: months,
          monthlyPayment: Math.round(payment),
        }, visitorContext)
      }
      lastTrackedRef.current = trackingKey
    }
  }, [vehicleValue, downPayment, months, monthlyRate, trackFinancingCalculation])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const downPaymentPercent = Math.round((downPayment / vehicleValue) * 100)
  const financedAmount = vehicleValue - downPayment

  const whatsappMessage = `Olá! Fiz uma simulação no site:
- Valor do veículo: ${formatCurrency(vehicleValue)}
- Entrada: ${formatCurrency(downPayment)} (${downPaymentPercent}%)
- Prazo: ${months} meses
- Parcela estimada: ${formatCurrency(monthlyPayment)}

Gostaria de mais informações sobre financiamento.`

  return (
    <div className="bg-background-card border border-border rounded-xl overflow-hidden">
      <div className="bg-primary/5 border-b border-primary/10 px-5 py-4 flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Simulador de Financiamento</h3>
          <p className="text-sm text-foreground-secondary">Calcule sua parcela em segundos</p>
        </div>
      </div>
      
      <div className="p-5 space-y-5">
        {/* Vehicle Value */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="calculadora-valor-do-veiculo" className="text-sm font-medium text-foreground">Valor do Veículo</label>
            <span className="text-lg font-bold text-primary">{formatCurrency(vehicleValue)}</span>
          </div>
          <input id="calculadora-valor-do-veiculo"
            type="range"
            min={100000}
            max={5000000}
            step={50000}
            value={vehicleValue}
            onChange={(e) => {
              const newValue = Number(e.target.value)
              setVehicleValue(newValue)
              setDownPayment(Math.round(newValue * 0.2))
            }}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-foreground-secondary mt-1">
            <span>R$ 100 mil</span>
            <span>R$ 5 milhões</span>
          </div>
        </div>

        {/* Down Payment */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="calculadora-entrada" className="text-sm font-medium text-foreground">Entrada ({downPaymentPercent}%)</label>
            <span className="text-base font-semibold text-foreground">{formatCurrency(downPayment)}</span>
          </div>
          <input id="calculadora-entrada"
            type="range"
            min={Math.round(vehicleValue * 0.2)}
            max={vehicleValue}
            step={10000}
            value={downPayment}
            onChange={(e) => setDownPayment(Number(e.target.value))}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-foreground-secondary mt-1">
            <span>20%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Months */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-foreground">Prazo</label>
            <span className="text-base font-semibold text-foreground">{months} meses</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[24, 36, 48, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  months === m
                    ? 'bg-primary text-white'
                    : 'bg-background border border-border text-foreground-secondary hover:border-primary'
                }`}
              >
                {m}x
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        <div className="bg-primary/5 rounded-lg p-4 text-center">
          <p className="text-sm text-foreground-secondary mb-1">Parcela estimada</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(monthlyPayment)}</p>
          <p className="text-xs text-foreground-secondary mt-1">
            Financiando {formatCurrency(financedAmount)}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-foreground-secondary">
          <TrendingDown className="w-4 h-4" />
          <span>Taxa estimada de 1,49% a.m. Condições especiais para clientes Attra.</span>
        </div>

        <Button asChild className="w-full">
          <a
            href={getWhatsAppUrl(whatsappMessage)}
            target="_blank"
            onClick={() => trackWhatsAppClick('/financiamento-calculator', undefined, getVisitorContext())}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Solicitar Proposta Real
          </a>
        </Button>
      </div>
    </div>
  )
}

