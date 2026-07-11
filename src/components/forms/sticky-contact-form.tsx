'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Loader2, X, MessageCircle, Car, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getWhatsAppUrl } from '@/lib/constants'
import { useVehicleContext } from '@/contexts/vehicle-context'
import { useVisitorTracking } from '@/components/providers/visitor-tracking-provider'

const schema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  interestType: z.string().min(1, 'Selecione uma opção'),
})

type FormData = z.infer<typeof schema>

const interestOptions = [
  { value: 'comprar', label: 'Comprar' },
  { value: 'vender', label: 'Vender' },
  { value: 'financiamento', label: 'Financiamento' },
  { value: 'test_drive', label: 'Test Drive' },
]

// Session-persisted keys
const DISMISSED_KEY = 'attra_exit_intent_dismissed'
const CONTACT_MADE_KEY = 'attra_contact_made'

// Minimum dwell time before exit intent becomes active (ms)
const ACTIVATION_DELAY_MS = 5_000

type PageMode = 'vehicle' | 'stock' | 'general'

function getPageMode(pathname: string): PageMode {
  if (pathname.startsWith('/veiculo/') || pathname.startsWith('/veiculos/')) return 'vehicle'
  if (pathname === '/veiculos' || pathname.startsWith('/veiculos') || pathname === '/estoque' || pathname.startsWith('/estoque')) return 'stock'
  return 'general'
}

export function StickyContactForm() {
  const pathname = usePathname()
  const { vehicle } = useVehicleContext()
  const { trackInteraction, getVisitorContext } = useVisitorTracking()

  const [isVisible, setIsVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Persisted state via sessionStorage (survives SPA navigation AND refresh)
  const [isDismissed, setIsDismissed] = useState(false)
  const [hasUserMadeContact, setHasUserMadeContact] = useState(false)

  // Activation delay ref — prevents triggering before user has time to engage
  const isActivatedRef = useRef(false)
  const activationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const pageMode = getPageMode(pathname)
  const vehicleName = vehicle
    ? `${vehicle.vehicleBrand || ''} ${vehicle.vehicleModel || ''}`.trim()
    : null

  // ── Hydrate persisted state from sessionStorage ──
  useEffect(() => {
    if (sessionStorage.getItem(CONTACT_MADE_KEY) === 'true') {
      setHasUserMadeContact(true)
    }
    if (sessionStorage.getItem(DISMISSED_KEY) === 'true') {
      setIsDismissed(true)
    }
  }, [])

  // ── Activation delay: listener only becomes active after ACTIVATION_DELAY_MS ──
  useEffect(() => {
    isActivatedRef.current = false
    activationTimerRef.current = setTimeout(() => {
      isActivatedRef.current = true
    }, ACTIVATION_DELAY_MS)

    return () => {
      if (activationTimerRef.current) clearTimeout(activationTimerRef.current)
    }
  }, [pathname]) // reset delay on each SPA navigation

  // ── Dismiss handler (must be declared before effects that use it) ──
  const handleDismiss = useCallback(() => {
    setIsDismissed(true)
    setIsVisible(false)
    sessionStorage.setItem(DISMISSED_KEY, 'true')
  }, [])

  // ── Exit intent listener ──
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (
        e.clientY <= 0 &&
        isActivatedRef.current &&
        !isDismissed &&
        !hasUserMadeContact &&
        !isVisible
      ) {
        setIsVisible(true)
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [isDismissed, hasUserMadeContact, isVisible])

  // ── Close on Escape key ──
  useEffect(() => {
    if (!isVisible) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, handleDismiss])

  // ── Form submission ──
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const vehicleInfo = pageMode === 'vehicle' && vehicleName
        ? `, Veículo: ${vehicleName}`
        : ''

      const visitorContext = getVisitorContext()
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          message: `Interesse: ${data.interestType}${vehicleInfo}`,
          formType: pageMode === 'vehicle' ? 'vehicle_inquiry' : 'general',
          sourcePage: `exit_intent_form_${pageMode}`,
          brand: vehicle?.vehicleBrand,
          model: vehicle?.vehicleModel,
          traffic: visitorContext.traffic,
          sessionId: visitorContext.sessionId,
        }),
      })

      // Notify the tracking provider that user converted
      trackInteraction('form_submit', {
        form_name: 'exit_intent_form',
        page_mode: pageMode,
        vehicle_name: vehicleName || undefined,
      })

      // Persist in sessionStorage
      sessionStorage.setItem(CONTACT_MADE_KEY, 'true')
      setHasUserMadeContact(true)
      setIsSuccess(true)
      reset()
    } catch (error) {
      console.error('[ExitIntent] Submit error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isVisible || isDismissed) return null

  // ── Vehicle page: centered modal with personalized CTA ──
  if (pageMode === 'vehicle') {
    const whatsAppMsg = vehicleName
      ? `Olá! Estava vendo o ${vehicleName} no site e gostaria de mais informações.`
      : 'Olá! Gostaria de mais informações sobre um veículo do site.'

    return (
      <div className="fixed inset-0 z-50 items-center justify-center bg-black/70 backdrop-blur-sm hidden lg:flex" onClick={handleDismiss}>
        <div className="bg-background-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-primary px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Car className="w-5 h-5" />
              <span className="font-semibold">Aguarde um momento!</span>
            </div>
            <button onClick={handleDismiss} className="text-white/80 hover:text-white" aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 text-center">
            {isSuccess ? (
              <SuccessMessage onReset={() => setIsSuccess(false)} />
            ) : (
              <>
                <p className="text-foreground text-lg font-medium mb-2">
                  {vehicleName
                    ? `Gostaria de receber uma proposta exclusiva para o ${vehicleName}?`
                    : 'Gostaria de receber uma proposta exclusiva?'}
                </p>
                <p className="text-foreground-secondary text-sm mb-6">
                  Nossos especialistas podem preparar uma condição especial para você.
                </p>

                <div className="flex flex-col gap-3">
                  <a
                    href={getWhatsAppUrl(whatsAppMsg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackInteraction('whatsapp_click', { source: 'exit_intent_vehicle' })}
                    className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Falar com Especialista
                  </a>

                  {/* Fallback form below */}
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center"><span className="bg-background-card px-3 text-xs text-foreground-secondary">ou preencha o formulário</span></div>
                  </div>

                  <FormFields
                    register={register}
                    errors={errors}
                    isSubmitting={isSubmitting}
                    onSubmit={handleSubmit(onSubmit)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Stock page: "Não encontrou?" centered modal ──
  if (pageMode === 'stock') {
    return (
      <div className="fixed inset-0 z-50 items-center justify-center bg-black/70 backdrop-blur-sm hidden lg:flex" onClick={handleDismiss}>
        <div className="bg-background-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
          <div className="bg-secondary px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Search className="w-5 h-5" />
              <span className="font-semibold">Não encontrou o que buscava?</span>
            </div>
            <button onClick={handleDismiss} className="text-white/80 hover:text-white" aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {isSuccess ? (
              <SuccessMessage onReset={() => setIsSuccess(false)} />
            ) : (
              <>
                <p className="text-foreground-secondary text-sm mb-4 text-center">
                  Nós buscamos o carro ideal para você! Deixe seus dados e entraremos em contato.
                </p>
                <FormFields
                  register={register}
                  errors={errors}
                  isSubmitting={isSubmitting}
                  onSubmit={handleSubmit(onSubmit)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── General pages: side-panel (original behavior, fixed) ──
  return (
    <div className={cn(
      'fixed right-0 top-1/2 -translate-y-1/2 z-40 transition-all duration-500',
      'hidden lg:block',
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    )}>
      <div className="bg-background-card border border-border rounded-l-2xl shadow-2xl shadow-black/20 w-80 overflow-hidden">
        <div className="bg-primary px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold text-sm">Fale Conosco</span>
          </div>
          <button onClick={handleDismiss} className="text-white/80 hover:text-white" aria-label="Fechar formulário">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {isSuccess ? (
            <SuccessMessage onReset={() => setIsSuccess(false)} />
          ) : (
            <>
              <p className="text-foreground-secondary text-sm mb-3">
                Preencha seus dados e entraremos em contato rapidamente.
              </p>
              <FormFields
                register={register}
                errors={errors}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit(onSubmit)}
                compact
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Reusable sub-components ──

function SuccessMessage({ onReset }: { onReset: () => void }) {
  return (
    <div className="text-center py-4">
      <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-foreground font-medium mb-1">Mensagem enviada!</p>
      <p className="text-foreground-secondary text-sm">Entraremos em contato em breve.</p>
      <button onClick={onReset} className="text-primary text-sm mt-3 hover:underline">
        Enviar nova mensagem
      </button>
    </div>
  )
}

interface FormFieldsProps {
  register: ReturnType<typeof useForm<FormData>>['register']
  errors: ReturnType<typeof useForm<FormData>>['formState']['errors']
  isSubmitting: boolean
  onSubmit: () => void
  compact?: boolean
}

function FormFields({ register, errors, isSubmitting, onSubmit, compact }: FormFieldsProps) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="space-y-3">
      <div>
        <Input
          {...register('name')}
          placeholder="Seu nome *"
          error={errors.name?.message}
          className={compact ? 'h-9 text-sm' : ''}
        />
      </div>
      <div>
        <Input
          {...register('email')}
          type="email"
          placeholder="Seu e-mail *"
          error={errors.email?.message}
          className={compact ? 'h-9 text-sm' : ''}
        />
      </div>
      <div>
        <Select
          {...register('interestType')}
          options={interestOptions}
          placeholder="Tipo de interesse *"
          className={compact ? 'h-9 text-sm' : ''}
        />
        {errors.interestType && (
          <p className="mt-1 text-xs text-primary">{errors.interestType.message}</p>
        )}
      </div>
      <Button type="submit" size={compact ? 'sm' : 'default'} className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
        ) : (
          'Enviar Mensagem'
        )}
      </Button>
      <p className="text-[10px] text-foreground-secondary text-center">
        Ao enviar, você concorda com nossa política de privacidade.
      </p>
    </form>
  )
}
