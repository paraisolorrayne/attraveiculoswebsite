'use client'

import { useState } from 'react'
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
  brand: z.string().min(1, 'Informe a marca'),
  model: z.string().min(1, 'Informe o modelo'),
  year: z.string().min(4, 'Informe o ano'),
  mileage: z.string().min(1, 'Informe a quilometragem'),
  condition: z.string().min(1, 'Selecione o estado do veículo'),
})

type FormData = z.infer<typeof schema>

const conditionOptions = [
  { value: 'excelente', label: 'Excelente' },
  { value: 'bom', label: 'Bom' },
  { value: 'regular', label: 'Regular' },
  { value: 'necessita-reparos', label: 'Necessita reparos' },
]

export function TradeInForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { trackFormSubmission } = useAnalytics()
  const { getVisitorContext, identifyVisitor } = useVisitorTracking()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const visitorContext = getVisitorContext()
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, subject: 'Avaliação de Veículo', sourcePage: '/compramos-seu-carro', traffic: visitorContext.traffic, sessionId: visitorContext.sessionId }),
      })

      // Track form submission in analytics with visitor context (includes geolocation)
      trackFormSubmission({
        formName: 'trade_in_form',
        formLocation: '/compramos-seu-carro',
        vehicleName: `${data.brand} ${data.model} ${data.year}`,
      }, visitorContext)

      // Identify visitor for GA4 User Properties and Clarity
      identifyVisitor({
        email: data.email,
        phone: data.phone,
        name: data.name,
      })

      setIsSuccess(true)
      reset()
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
        <p className="text-foreground-secondary text-sm mt-2">Entraremos em contato em breve com a avaliação.</p>
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
          <label className="block text-sm font-medium text-foreground mb-1">Marca</label>
          <Input {...register('brand')} placeholder="Ex: BMW" error={errors.brand?.message} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Modelo</label>
          <Input {...register('model')} placeholder="Ex: X5" error={errors.model?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Ano</label>
          <Input {...register('year')} placeholder="Ex: 2023" error={errors.year?.message} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Quilometragem</label>
          <Input {...register('mileage')} placeholder="Ex: 25000" error={errors.mileage?.message} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Estado</label>
          <Select {...register('condition')} options={conditionOptions} placeholder="Selecione" />
          {errors.condition && <p className="mt-1 text-sm text-primary">{errors.condition.message}</p>}
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : 'Solicitar Avaliação'}
      </Button>

      <p className="text-xs text-foreground-secondary text-center">
        Ao enviar, você concorda com nossa política de privacidade.
      </p>
    </form>
  )
}

