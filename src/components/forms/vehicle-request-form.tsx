'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { useAnalytics } from '@/hooks/use-analytics'
import { useVisitorTracking } from '@/components/providers/visitor-tracking-provider'

const schema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  brand: z.string().min(1, 'Informe a marca desejada'),
  model: z.string().min(1, 'Informe o modelo desejado'),
  yearMin: z.string().optional(),
  yearMax: z.string().optional(),
  budgetMax: z.string().optional(),
  details: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function VehicleRequestForm() {
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
        body: JSON.stringify({ ...data, subject: 'Solicitação de Veículo', sourcePage: '/solicitar-veiculo', traffic: visitorContext.traffic, sessionId: visitorContext.sessionId }),
      })

      // Track form submission in analytics with visitor context (includes geolocation)
      trackFormSubmission({
        formName: 'vehicle_request_form',
        formLocation: '/veiculos',
        vehicleName: `${data.brand} ${data.model}`,
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
        <p className="text-foreground-secondary text-sm mt-2">Iniciaremos a busca e entraremos em contato em breve.</p>
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
          <label className="block text-sm font-medium text-foreground mb-1">Marca desejada</label>
          <Input {...register('brand')} placeholder="Ex: Porsche" error={errors.brand?.message} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Modelo desejado</label>
          <Input {...register('model')} placeholder="Ex: 911 Carrera" error={errors.model?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Ano mínimo</label>
          <Input {...register('yearMin')} placeholder="Ex: 2022" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Ano máximo</label>
          <Input {...register('yearMax')} placeholder="Ex: 2024" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Orçamento máximo</label>
          <Input {...register('budgetMax')} placeholder="R$ 800.000" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Detalhes adicionais (opcional)</label>
        <textarea
          {...register('details')}
          className="w-full h-24 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          placeholder="Cor, opcionais, versão específica..."
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : 'Enviar Solicitação'}
      </Button>

      <p className="text-xs text-foreground-secondary text-center">
        Ao enviar, você concorda com nossa política de privacidade.
      </p>
    </form>
  )
}

