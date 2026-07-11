'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Car } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getGeoLocation, generateVehicleMessage } from '@/lib/webhook'
import { WHATSAPP_NUMBER, isSeoPage } from '@/lib/constants'
import { GeoLocation } from '@/types'
import { useVehicleContext } from '@/contexts/vehicle-context'
import { useAnalytics } from '@/hooks/use-analytics'
import { useVisitorTracking } from '@/components/providers/visitor-tracking-provider'

interface WhatsAppButtonProps {
  sourcePage?: string // Optional - will auto-detect from pathname if not provided
}

// Build a human-readable label from the SEO page path for tracking
const getSeoPageLabel = (path: string): string => {
  const slug = path.split('/').filter(Boolean).pop() || path
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Context-aware title/subtitle/message based on page and vehicle context
function getContextMessage(sourcePage: string, vehicleBrand?: string, vehicleModel?: string) {
  if (vehicleBrand && vehicleModel) {
    return {
      title: `Interesse no ${vehicleBrand} ${vehicleModel}?`,
      subtitle: 'Fale com um consultor especializado',
      message: `Olá! Tenho interesse no ${vehicleBrand} ${vehicleModel}. Gostaria de mais informações.`,
      buttonText: 'Tenho interesse',
    }
  }

  if (isSeoPage(sourcePage)) {
    const label = getSeoPageLabel(sourcePage)
    return {
      title: 'Falar com especialista',
      subtitle: 'Atendimento direto via WhatsApp',
      message: `Olá! Vim da página "${label}" e gostaria de mais informações. [ref: ${sourcePage}]`,
      buttonText: 'Abrir WhatsApp',
    }
  }

  return {
    title: 'Fale conosco',
    subtitle: 'Atendimento direto via WhatsApp',
    message: 'Olá! Gostaria de mais informações sobre os veículos disponíveis.',
    buttonText: 'Abrir WhatsApp',
  }
}

// Detecta se estamos em viewport mobile (md breakpoint do Tailwind = 768px)
function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 767px)').matches
}

// Detecta se há campo de input em foco — evita interromper o usuário
function isTypingInForm(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function WhatsAppButton({ sourcePage }: WhatsAppButtonProps) {
  const pathname = usePathname()
  const { vehicle } = useVehicleContext()
  const { trackWhatsAppClick } = useAnalytics()
  const { getVisitorContext, trackInteraction } = useVisitorTracking()
  const [isOpen, setIsOpen] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [geoLocation, setGeoLocation] = useState<GeoLocation | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLAnchorElement | null>(null)

  const vehicleId = vehicle?.vehicleId
  const vehicleBrand = vehicle?.vehicleBrand
  const vehicleModel = vehicle?.vehicleModel
  const vehicleYear = vehicle?.vehicleYear

  const currentPage = sourcePage && sourcePage !== 'global' ? sourcePage : pathname

  const context = getContextMessage(currentPage, vehicleBrand, vehicleModel)

  useEffect(() => {
    const fetchGeoLocation = async () => {
      const location = await getGeoLocation()
      if (location) setGeoLocation(location)
    }
    fetchGeoLocation()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setScrollProgress(progress)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-open tooltip: apenas desktop (>=md), 15s, e só se o usuário não
  // estiver digitando em um formulário. Em mobile o tooltip ocupa muito
  // espaço e atrapalha, então não há auto-open.
  useEffect(() => {
    if (hasInteracted) return
    if (isMobileViewport()) return

    const timer = window.setTimeout(() => {
      if (!isTypingInForm()) setIsOpen(true)
    }, 15000)
    return () => window.clearTimeout(timer)
  }, [hasInteracted])

  // Fecha tooltip ao tocar/clicar fora (mobile-safe, já que onMouseLeave
  // não dispara em touch).
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: Event) => {
      const target = e.target as Node
      if (
        tooltipRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return
      }
      setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [isOpen])

  // Fecha tooltip ao pressionar ESC (acessibilidade desktop)
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  // URL wa.me memoizada — calculada de forma síncrona pra ser usada como
  // href do anchor (preserva o user-gesture do clique).
  const whatsAppUrl = useMemo(() => {
    const message =
      isSeoPage(currentPage) && !vehicleBrand
        ? context.message
        : generateVehicleMessage(vehicleBrand, vehicleModel, vehicleYear, geoLocation)
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
  }, [currentPage, vehicleBrand, vehicleModel, vehicleYear, geoLocation, context.message])

  const IconComponent = vehicleBrand && vehicleModel ? Car : MessageCircle

  // Disparado pelo clique no anchor — fire-and-forget de analytics e
  // webhook. Nada aqui pode aguardar promise, senão o navegador descarta
  // o user-gesture e o popup blocker entra.
  const handleAnchorClick = () => {
    setHasInteracted(true)
    setIsOpen(false)

    const visitorContext = getVisitorContext()

    // Analytics — síncrono (gtag/dataLayer push)
    trackWhatsAppClick(
      currentPage,
      vehicleId
        ? {
            id: vehicleId,
            name: `${vehicleBrand} ${vehicleModel}`,
            brand: vehicleBrand || '',
            price: 0,
          }
        : undefined,
      visitorContext,
    )

    // Marcação interna (visitor_page_views.whatsapp_clicked)
    trackInteraction('whatsapp_click', {
      page_path: currentPage,
      vehicle_id: vehicleId,
      vehicle_brand: vehicleBrand,
      vehicle_model: vehicleModel,
    })

    // O navegador segue com a navegação nativa do <a target="_blank">
  }

  // Posicionamento responsivo:
  // - bottom respeita safe-area-inset (notch / home indicator iOS)
  // - mobile: tooltip ocupa quase a largura inteira da tela com folga
  // - desktop (sm+): largura fixa 18rem (w-72)
  return (
    <>
      {/* Floating button (anchor — preserva user-gesture do clique) */}
      <a
        ref={buttonRef}
        href={whatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleAnchorClick}
        onMouseEnter={() => {
          setIsOpen(true)
          setHasInteracted(true)
        }}
        style={{
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        }}
        className={cn(
          'fixed right-4 sm:right-6 z-50 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all duration-300 hover:scale-110',
          // Pulse-glow limitado a ~4 ciclos (8s) pra não drenar bateria
          !hasInteracted && 'animate-pulse-glow [animation-iteration-count:4]',
        )}
        aria-label="Falar pelo WhatsApp"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
      </a>

      {/* Backdrop tocável em mobile pra fechar o tooltip */}
      {isOpen && (
        <button
          type="button"
          aria-label="Fechar tooltip"
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-transparent"
        />
      )}

      {/* Context-aware tooltip */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-label={context.title}
        style={{
          bottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
        }}
        className={cn(
          'fixed right-4 sm:right-6 z-50 bg-background-card border border-border rounded-2xl shadow-2xl p-5 transition-all duration-300',
          // Mobile: largura adaptativa (viewport - 2rem), max 20rem
          // Desktop (sm+): largura fixa 18rem
          'w-[calc(100vw-2rem)] max-w-xs sm:w-72',
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
        )}
        onMouseLeave={() => setIsOpen(false)}
      >
        <button
          onClick={() => {
            setIsOpen(false)
            setHasInteracted(true)
          }}
          className="absolute top-3 right-3 p-1 text-foreground-secondary hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-xl shrink-0 bg-green-500/10">
            <IconComponent className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-foreground font-semibold">{context.title}</p>
            {context.subtitle && (
              <p className="text-foreground-secondary text-sm">{context.subtitle}</p>
            )}
          </div>
        </div>

        {/* CTA do tooltip — anchor direto (sem await) */}
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAnchorClick}
          className="w-full flex items-center justify-center gap-2 text-white rounded-xl py-3 px-4 font-medium transition-colors btn-press bg-green-500 hover:bg-green-600"
        >
          <MessageCircle className="w-5 h-5" />
          {context.buttonText}
        </a>
      </div>
    </>
  )
}
