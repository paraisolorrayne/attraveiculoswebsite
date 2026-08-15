'use client'

import { useState } from 'react'
import { medirOpenAI } from '@/components/analytics'
import { FormErrorFallback } from './form-error-fallback'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { useAnalytics, pushAnalyticsEvent } from '@/hooks/use-analytics'
import { eventoDeSolicitacao } from '@/lib/analytics-marca'
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

interface VehicleRequestFormProps {
  /** De onde o lead partiu (ex.: "/ferrari"). */
  origem?: string
  /** Marca da página, pré-preenchida no formulário. */
  marcaInicial?: string
  /** Modelo da página, pré-preenchido quando a página é de modelo. */
  modeloInicial?: string
  /** Categoria editorial da origem (ex.: "superesportivos"). */
  categoria?: string
}

/**
 * `origem` marca de onde o lead partiu (ex.: "/comprar/porsche"). Sem isso, um
 * pedido vindo da página de marca chega indistinguível de um pedido genérico —
 * e é justamente essa distinção que responde qual intenção gera negócio.
 *
 * `marcaInicial` e `modeloInicial` pré-preenchem os campos a partir da página.
 * Quem clica em "Solicitar uma Ferrari" já disse qual marca quer; pedir que
 * digite de novo é atrito puro, e o campo em branco ainda deixa o lead chegar
 * ao comercial sem marca quando a pessoa desiste no meio.
 *
 * Os campos continuam EDITÁVEIS de propósito: quem chegou por /ferrari pode
 * acabar pedindo outra coisa, e travar o campo transformaria a página numa
 * armadilha.
 */
export function VehicleRequestForm({
  origem,
  marcaInicial,
  modeloInicial,
  categoria,
}: VehicleRequestFormProps = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [erroEnvio, setErroEnvio] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { trackFormSubmission } = useAnalytics()
  const { getVisitorContext, identifyVisitor } = useVisitorTracking()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    // O pré-preenchimento vem do `defaultValue` de cada Input, não daqui.
    // Testado no navegador em 15/08: com `defaultValues` no useForm os campos
    // renderizavam vazios (o placeholder aparecia, provando que a prop chegava,
    // mas o value não). `defaultValue` no input não-controlado funciona, e o
    // react-hook-form lê o valor do DOM no envio.
    defaultValues: {
      brand: marcaInicial ?? '',
      model: modeloInicial ?? '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setErroEnvio(false)
    try {
      const visitorContext = getVisitorContext()
      const resposta = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, subject: 'Solicitação de Veículo', sourcePage: origem ?? '/solicitar-veiculo', sourceCategory: categoria, traffic: visitorContext.traffic, sessionId: visitorContext.sessionId }),
      })
      // A API devolve 502 quando nenhum canal (e-mail, WhatsApp, webhook)
      // recebeu o lead. Sem esta checagem o formulário anunciava sucesso
      // para um envio que não chegou a ninguém.
      if (!resposta.ok) throw new Error('lead não entregue')

      // Conversão do OpenAI Ads — DEPOIS do !resposta.ok, não antes.
      // A rota devolve 502 quando nenhum canal recebeu o lead; medir antes
      // contaria como conversão um envio que não chegou a ninguém.
      medirOpenAI('lead_submitted', {
        type: 'customer_action',
        amount: 0,
        currency: 'BRL',
      })


      // Track form submission in analytics with visitor context (includes geolocation)
      trackFormSubmission({
        formName: 'vehicle_request_form',
        formLocation: '/veiculos',
        vehicleName: `${data.brand} ${data.model}`,
      }, visitorContext)

      // Evento próprio da solicitação (item 26): reporta a marca e o modelo
      // ENVIADOS, não os que a página pré-preencheu — quem chega por /ferrari
      // pode acabar pedindo uma McLaren, e o relatório precisa dizer isso.
      const solicitacao = eventoDeSolicitacao({
        marca: data.brand,
        modelo: data.model,
        categoria,
        caminho: origem ?? '/solicitar-veiculo',
      })
      pushAnalyticsEvent(solicitacao.nome, solicitacao.params, visitorContext)

      // Identify visitor for GA4 User Properties and Clarity
      identifyVisitor({
        email: data.email,
        phone: data.phone,
        name: data.name,
      })

      setIsSuccess(true)
      reset()
    } catch (error) {
      setErroEnvio(true)
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
          <Input
            {...register('brand')}
            defaultValue={marcaInicial}
            placeholder={marcaInicial ?? 'Ex: Porsche'}
            error={errors.brand?.message}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Modelo desejado</label>
          <Input
            {...register('model')}
            defaultValue={modeloInicial}
            placeholder={modeloInicial ?? 'Ex: 911 Carrera'}
            error={errors.model?.message}
          />
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
      {erroEnvio && <FormErrorFallback />}
    </form>
  )
}

