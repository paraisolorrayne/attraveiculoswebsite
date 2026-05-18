'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, MessageCircle, ShieldCheck, Loader2 } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SectionKicker, SectionHeading } from '@/components/ui/brand'
import { getWhatsAppUrl } from '@/lib/constants'
import { useAnalytics } from '@/hooks/use-analytics'
import { useVisitorTracking } from '@/components/providers/visitor-tracking-provider'

const schema = z.object({
  name: z.string().min(3, 'Informe seu nome'),
  phone: z.string().min(10, 'WhatsApp inválido'),
  vehicle: z.string().min(2, 'Conte o que você procura'),
  budget: z.string().min(1, 'Selecione uma faixa'),
})

type FormData = z.infer<typeof schema>

const budgetOptions = [
  { value: 'ate-300k',   label: 'Até R$ 300 mil' },
  { value: '300-500k',   label: 'R$ 300 a 500 mil' },
  { value: '500k-1m',    label: 'R$ 500 mil a 1 milhão' },
  { value: '1m-2m',      label: 'R$ 1 a 2 milhões' },
  { value: 'acima-2m',   label: 'Acima de R$ 2 milhões' },
  { value: 'indefinida', label: 'Prefiro conversar' },
]

const whatsappMessage =
  'Olá, Attra. Tenho interesse em um atendimento consultivo para um veículo premium.'

export function LeadCaptureSection() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { trackFormSubmission } = useAnalytics()
  const { getVisitorContext, identifyVisitor } = useVisitorTracking()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const visitorContext = getVisitorContext()
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          model: data.vehicle,
          budgetMax: data.budget,
          subject: 'Captação Home — Consultoria Attra',
          formType: 'lead_capture_home',
          sourcePage: '/',
          traffic: visitorContext.traffic,
        }),
      })

      trackFormSubmission(
        {
          formName: 'lead_capture_home',
          formLocation: '/',
          vehicleName: data.vehicle,
        },
        visitorContext,
      )

      identifyVisitor({ phone: data.phone, name: data.name })

      setIsSuccess(true)
      reset()
    } catch (error) {
      console.error('[LeadCapture] submit error', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      id="captacao"
      className="py-16 md:py-20 bg-gradient-to-br from-background-soft via-background to-background-soft"
    >
      <Container size="xl">
        {/* Header centralizado em uma única coluna no topo — substitui o
            antigo split 2-col "narrative à esquerda + card à direita"
            (padrão LP de SaaS). Aqui a narrativa abre a seção em largura
            cheia e o form fica abaixo, em fluxo editorial. */}
        <div className="max-w-2xl mb-10 md:mb-14">
          <SectionKicker className="mb-4">Consultoria Attra</SectionKicker>
          <SectionHeading as="h2" size="lg" className="mb-5">
            Nos conte o que você procura. Nós encontramos.
          </SectionHeading>
          <p className="text-foreground-secondary text-base md:text-lg leading-relaxed">
            Busca discreta em rede nacional de procedência. Sem pressão e sem
            vitrine — só o carro certo, no momento certo.
          </p>
        </div>

        {/* Form sem card — campos em grid horizontal (4 colunas em desktop,
            quebrando para 2/1 em viewports menores). Tira o look "caixa de
            captura LP" do card sombreado e mantém o respiro da seção. */}
        {isSuccess ? (
          <div className="max-w-xl py-6">
            <div className="mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              Recebido. Um consultor entrará em contato.
            </h3>
            <p className="text-foreground-secondary text-sm md:text-base mb-6">
              Você também pode seguir a conversa agora pelo WhatsApp.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <a
                href={getWhatsAppUrl(whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Continuar no WhatsApp
              </a>
              <button
                type="button"
                onClick={() => setIsSuccess(false)}
                className="text-primary text-sm hover:underline"
              >
                Enviar nova solicitação
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-1.5">
                  Nome
                </label>
                <Input
                  {...register('name')}
                  placeholder="Como devemos te chamar?"
                  error={errors.name?.message}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-1.5">
                  WhatsApp
                </label>
                <Input
                  {...register('phone')}
                  placeholder="(00) 00000-0000"
                  error={errors.phone?.message}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-1.5">
                  Veículo desejado
                </label>
                <Input
                  {...register('vehicle')}
                  placeholder="Ex.: Porsche 911, Range Rover…"
                  error={errors.vehicle?.message}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-1.5">
                  Faixa de valor
                </label>
                <Select
                  {...register('budget')}
                  options={budgetOptions}
                  placeholder="Selecione"
                />
                {errors.budget && (
                  <p className="mt-1 text-sm text-primary">{errors.budget.message}</p>
                )}
              </div>
            </div>

            {/* Linha de ação — submit primary + WhatsApp inline + meta info.
                Substitui o "ou" divider central que era padrão LP. */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2">
              <div className="flex flex-wrap items-center gap-5">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold text-base px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      Quero atendimento consultivo
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <a
                  href={getWhatsAppUrl(whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground text-sm font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="border-b border-foreground-secondary/40 hover:border-foreground/60 pb-0.5 transition-colors">
                    Falar agora pelo WhatsApp
                  </span>
                </a>
              </div>
              <p className="text-[11px] text-foreground-secondary uppercase tracking-wider">
                Confidencial · Rede nacional · Sem compromisso
              </p>
            </div>
          </form>
        )}
      </Container>
    </section>
  )
}
