'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Download, CheckCircle } from 'lucide-react'
import { useAnalytics } from '@/hooks/use-analytics'
import { useVisitorTracking } from '@/components/providers/visitor-tracking-provider'

const schema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export function LeadMagnetForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { trackGuideDownload, trackFormSubmission } = useAnalytics()
  const { getVisitorContext, identifyVisitor } = useVisitorTracking()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const visitorContext = getVisitorContext()

      // Captura o lead (email + Avisa + Fykos) via rota unificada
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          message: 'Baixou o Guia Supercarro Attra',
          formType: 'lead_magnet',
          sourcePage: '/guia-supercarro-gratis',
          traffic: visitorContext.traffic,
          sessionId: visitorContext.sessionId,
        }),
      })

      // Track form submission and guide download in analytics with visitor context (includes geolocation)
      trackFormSubmission({
        formName: 'lead_magnet_form',
        formLocation: '/guia-supercarro-gratis',
      }, visitorContext)
      trackGuideDownload('Guia Supercarro Attra', data.email, visitorContext)

      // Identify visitor for GA4 User Properties and Clarity
      identifyVisitor({
        email: data.email,
        phone: data.phone || undefined,
        name: data.name,
      })

      setIsSuccess(true)

      // Simulate PDF download after short delay
      setTimeout(() => {
        // In production, this would be a real PDF URL
        const link = document.createElement('a')
        link.href = '/downloads/guia-supercarro-attra.pdf'
        link.download = 'Guia-Supercarro-Attra-Veiculos.pdf'
        link.click()
      }, 1000)
    } catch (error) {
      console.error('Error:', error)
      // Still show success to not frustrate user
      setIsSuccess(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Guia Enviado!</h3>
        <p className="text-foreground-secondary mb-4">
          O download começará automaticamente. Também enviamos o guia para seu e-mail.
        </p>
        <Button 
          variant="outline" 
          onClick={() => {
            const link = document.createElement('a')
            link.href = '/downloads/guia-supercarro-attra.pdf'
            link.download = 'Guia-Supercarro-Attra-Veiculos.pdf'
            link.click()
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Baixar Novamente
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Nome completo *
        </label>
        <Input 
          {...register('name')} 
          placeholder="Seu nome" 
          error={errors.name?.message}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          E-mail *
        </label>
        <Input 
          {...register('email')} 
          type="email" 
          placeholder="seu@email.com" 
          error={errors.email?.message}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          WhatsApp <span className="text-foreground-secondary font-normal">(opcional)</span>
        </label>
        <Input 
          {...register('phone')} 
          placeholder="(00) 00000-0000" 
          error={errors.phone?.message}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparando download...</>
        ) : (
          <><Download className="w-4 h-4 mr-2" /> Baixar Guia Gratuito</>
        )}
      </Button>

      <p className="text-xs text-foreground-secondary text-center">
        🔒 Seus dados estão seguros. Não enviamos spam.
      </p>

      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-center gap-6 text-sm text-foreground-secondary">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
            </svg>
            8 páginas
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
            </svg>
            5 min leitura
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
            PDF
          </div>
        </div>
      </div>
    </form>
  )
}

