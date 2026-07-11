'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useAnalytics } from '@/hooks/use-analytics'
import { useVisitorTracking } from '@/components/providers/visitor-tracking-provider'

const schema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  vehicleValue: z.string().min(1, 'Informe o valor do veículo'),
  downPayment: z.string().optional(),
  installments: z.string().min(1, 'Selecione o número de parcelas'),
})

type FormData = z.infer<typeof schema>

// Currency mask helper - formats to BRL (R$ 1.234,56)
function formatCurrency(value: string): string {
  // Remove tudo exceto números
  const numericValue = value.replace(/\D/g, '')

  if (!numericValue) return ''

  // Converter para número (centavos)
  const cents = parseInt(numericValue, 10)

  // Formatar como moeda BRL
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(cents / 100)

  return formatted
}

const installmentOptions = [
  { value: '12', label: '12x' },
  { value: '24', label: '24x' },
  { value: '36', label: '36x' },
  { value: '48', label: '48x' },
  { value: '60', label: '60x' },
]

export function FinancingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [vehicleValueDisplay, setVehicleValueDisplay] = useState('')
  const [downPaymentDisplay, setDownPaymentDisplay] = useState('')
  const { trackFormSubmission, trackFinancingCalculation } = useAnalytics()
  const { getVisitorContext, identifyVisitor } = useVisitorTracking()

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Handler for vehicle value input with currency mask
  const handleVehicleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value)
    setVehicleValueDisplay(formatted)
    setValue('vehicleValue', formatted)
  }, [setValue])

  // Handler for down payment input with currency mask
  const handleDownPaymentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value)
    setDownPaymentDisplay(formatted)
    setValue('downPayment', formatted)
  }, [setValue])

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      // Parse currency values for analytics
      const parseValue = (str: string) => {
        const num = str.replace(/[^\d,]/g, '').replace(',', '.')
        return parseFloat(num) || 0
      }
      const vehiclePrice = parseValue(data.vehicleValue)
      const downPayment = parseValue(data.downPayment || '')
      const installments = parseInt(data.installments) || 48

      const visitorContext = getVisitorContext()
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, subject: 'Simulação de Financiamento', sourcePage: '/financiamento', traffic: visitorContext.traffic, sessionId: visitorContext.sessionId }),
      })

      // Track financing calculation in analytics with visitor context (includes geolocation)
      trackFinancingCalculation({
        vehiclePrice,
        downPayment,
        installments,
        monthlyPayment: (vehiclePrice - downPayment) / installments,
      }, visitorContext)

      // Track form submission with visitor context
      trackFormSubmission({
        formName: 'financing_form',
        formLocation: '/financiamento',
      }, visitorContext)

      // Identify visitor for GA4 User Properties and Clarity
      identifyVisitor({
        email: data.email,
        phone: data.phone,
        name: data.name,
      })

      setIsSuccess(true)
      reset()
      setVehicleValueDisplay('')
      setDownPaymentDisplay('')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="bg-green-500/10 border border-green-500 rounded-xl p-6 text-center">
        <p className="text-green-600 dark:text-green-400 font-medium">Solicitação enviada com sucesso!</p>
        <p className="text-foreground-secondary text-sm mt-2">Entraremos em contato em breve.</p>
        <button onClick={() => setIsSuccess(false)} className="text-primary text-sm mt-4 hover:underline">Enviar nova solicitação</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Nome completo</label>
        <Input {...register('name')} placeholder="Seu nome" error={errors.name?.message} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">E-mail</label>
          <Input {...register('email')} type="email" placeholder="seu@email.com" error={errors.email?.message} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Telefone</label>
          <Input {...register('phone')} placeholder="(00) 00000-0000" error={errors.phone?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Valor do veículo</label>
          <Input
            type="text"
            inputMode="numeric"
            value={vehicleValueDisplay}
            onChange={handleVehicleValueChange}
            placeholder="R$ 0,00"
            error={errors.vehicleValue?.message}
          />
          <input type="hidden" {...register('vehicleValue')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Entrada (opcional)</label>
          <Input
            type="text"
            inputMode="numeric"
            value={downPaymentDisplay}
            onChange={handleDownPaymentChange}
            placeholder="R$ 0,00"
          />
          <input type="hidden" {...register('downPayment')} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Número de parcelas</label>
        <Select {...register('installments')} options={installmentOptions} placeholder="Selecione" />
        {errors.installments && <p className="mt-1 text-sm text-primary">{errors.installments.message}</p>}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : 'Solicitar Simulação'}
      </Button>

      <p className="text-xs text-foreground-secondary text-center">
        Ao enviar, você concorda com nossa política de privacidade.
      </p>
    </form>
  )
}

