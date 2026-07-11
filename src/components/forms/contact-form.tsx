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
  subject: z.string().min(1, 'Selecione um assunto'),
  message: z.string().min(10, 'Mensagem deve ter no mínimo 10 caracteres'),
})

type FormData = z.infer<typeof schema>

const subjectOptions = [
  { value: 'duvida', label: 'Dúvida geral' },
  { value: 'veiculo', label: 'Interesse em veículo' },
  { value: 'financiamento', label: 'Financiamento' },
  { value: 'venda', label: 'Vender meu carro' },
  { value: 'parceria', label: 'Parceria comercial' },
  { value: 'outro', label: 'Outro assunto' },
]

export function ContactForm() {
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
        body: JSON.stringify({ ...data, sourcePage: '/contato', traffic: visitorContext.traffic, sessionId: visitorContext.sessionId }),
      })

      // Track form submission in analytics with visitor context (includes geolocation)
      trackFormSubmission({
        formName: 'contact_form',
        formLocation: '/contato',
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
        <p className="text-green-600 dark:text-green-400 font-medium">Mensagem enviada com sucesso!</p>
        <p className="text-foreground-secondary text-sm mt-2">Entraremos em contato em breve.</p>
        <button onClick={() => setIsSuccess(false)} className="text-primary text-sm mt-4 hover:underline">Enviar nova mensagem</button>
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

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Assunto</label>
        <Select {...register('subject')} options={subjectOptions} placeholder="Selecione um assunto" />
        {errors.subject && <p className="mt-1 text-sm text-primary">{errors.subject.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Mensagem</label>
        <textarea
          {...register('message')}
          className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          placeholder="Como podemos ajudar?"
        />
        {errors.message && <p className="mt-1 text-sm text-primary">{errors.message.message}</p>}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : 'Enviar Mensagem'}
      </Button>

      <p className="text-xs text-foreground-secondary text-center">
        Ao enviar, você concorda com nossa política de privacidade.
      </p>
    </form>
  )
}

