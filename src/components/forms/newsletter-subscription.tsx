'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Mail, CheckCircle, Sparkles } from 'lucide-react'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})

type FormData = z.infer<typeof schema>

interface NewsletterSubscriptionProps {
  variant?: 'default' | 'inline' | 'card'
  source?: string
}

export function NewsletterSubscription({ 
  variant = 'card',
  source = 'blog'
}: NewsletterSubscriptionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      // Save to Supabase newsletter_subscribers table
      await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, source: `newsletter_${source}` }),
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
      <div className={`${variant === 'card' ? 'bg-background-card border border-border rounded-xl p-6' : ''} text-center`}>
        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">Inscrição Confirmada!</h3>
        <p className="text-foreground-secondary text-sm">
          Você receberá nossos melhores conteúdos sobre o universo automotivo premium.
        </p>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
        <Input 
          {...register('email')} 
          type="email" 
          placeholder="Seu e-mail" 
          error={errors.email?.message}
          className="flex-1"
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Inscrever'}
        </Button>
      </form>
    )
  }

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">Attra Insights</h3>
            <p className="text-sm text-foreground-secondary">Newsletter exclusiva</p>
          </div>
        </div>
        
        <p className="text-foreground-secondary mb-5">
          Receba análises exclusivas, tendências de mercado e conteúdos sobre o universo dos supercarros 
          diretamente no seu e-mail.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
            <Input 
              {...register('email')} 
              type="email" 
              placeholder="Seu melhor e-mail" 
              error={errors.email?.message}
              className="pl-10"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Inscrevendo...</>
            ) : (
              'Quero Receber'
            )}
          </Button>
        </form>

        <p className="text-xs text-foreground-secondary text-center mt-4">
          📬 Conteúdo quinzenal • Sem spam • Cancele quando quiser
        </p>
      </div>
    </div>
  )
}

