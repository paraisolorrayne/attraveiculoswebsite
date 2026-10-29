'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconeWhatsApp } from '@/components/ui/icone-whatsapp'
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

// Context-aware title/subtitle/message based on page and vehicle context.
// Exportada para a aba do WhatsApp da barra do celular mandar o mesmo texto.
export function getContextMessage(sourcePage: string, vehicleBrand?: string, vehicleModel?: string) {
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
      message: `Olá! Vim da página "${label}" e gostaria de mais informações.`,
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
const ATRASO_BOTAO_MS = 2500

// O balão abre sozinho UMA vez por sessão, depois de 40 s ou da metade da
// página, e some sozinho se ninguém mexer. Antes abria aos 15 s, reabria a cada
// passada do mouse e ficava por cima do preço e do botão do card em destaque
// (avaliação de 29/10/2026).
const BALAO_VISTO = 'attra_whatsapp_balao_visto'
const BALAO_ESPERA_MS = 40_000
const BALAO_ROLAGEM = 0.5
const BALAO_FICA_MS = 12_000

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
  const { getVisitorContext, sessionId } = useVisitorTracking()
  const [isOpen, setIsOpen] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [geoLocation, setGeoLocation] = useState<GeoLocation | null>(null)
  const [pronto, setPronto] = useState(false)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLAnchorElement | null>(null)

  const vehicleId = vehicle?.vehicleId
  const vehicleBrand = vehicle?.vehicleBrand
  const vehicleModel = vehicle?.vehicleModel
  const vehicleYear = vehicle?.vehicleYear

  const currentPage = sourcePage && sourcePage !== 'global' ? sourcePage : pathname

  // Na ficha do veículo o balão não abre, nem sozinho nem com o mouse; a
  // bolinha fica e leva direto ao WhatsApp. Até 23/10/2026 o balão abria 15 s
  // depois da chegada por cima da lateral e cobria o "Financiar".
  const naFicha = pathname?.startsWith('/veiculo/') ?? false
  const balaoAberto = isOpen && !naFicha

  const context = getContextMessage(currentPage, vehicleBrand, vehicleModel)

  // O botão só aparece (e só aceita toque) depois de ATRASO_BOTAO_MS da chegada.
  //
  // Medido em 02/10/2026: ~23% dos cliques no WhatsApp vinham em menos de 3 s
  // da chegada, quase todos neste botão, na página inicial, no celular — o
  // toque seguinte ao do anúncio caía onde o botão aparece. Como o componente
  // fica no layout, o atraso vale só para a página de entrada, não a cada
  // navegação interna.
  useEffect(() => {
    const timer = window.setTimeout(() => setPronto(true), ATRASO_BOTAO_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const fetchGeoLocation = async () => {
      const location = await getGeoLocation()
      if (location) setGeoLocation(location)
    }
    fetchGeoLocation()
  }, [])

  // Abertura automática: só no computador (no celular o balão ocupa a tela),
  // fora da ficha, nunca com alguém digitando, e uma vez por sessão.
  useEffect(() => {
    if (hasInteracted || naFicha || isMobileViewport()) return
    try {
      if (sessionStorage.getItem(BALAO_VISTO)) return
    } catch {}

    const abrir = () => {
      if (isTypingInForm()) return
      try {
        sessionStorage.setItem(BALAO_VISTO, '1')
      } catch {}
      parar()
      setIsOpen(true)
    }
    const aoRolar = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      if (total > 0 && window.scrollY / total >= BALAO_ROLAGEM) abrir()
    }
    const timer = window.setTimeout(abrir, BALAO_ESPERA_MS)
    window.addEventListener('scroll', aoRolar, { passive: true })
    function parar() {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', aoRolar)
    }
    return parar
  }, [hasInteracted, naFicha])

  // Aberto, some sozinho depois de BALAO_FICA_MS.
  useEffect(() => {
    if (!balaoAberto) return
    const timer = window.setTimeout(() => setIsOpen(false), BALAO_FICA_MS)
    return () => window.clearTimeout(timer)
  }, [balaoAberto])

  // Fecha tooltip ao tocar/clicar fora (mobile-safe, já que onMouseLeave
  // não dispara em touch).
  useEffect(() => {
    if (!balaoAberto) return

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
  }, [balaoAberto])

  // Fecha tooltip ao pressionar ESC (acessibilidade desktop)
  useEffect(() => {
    if (!balaoAberto) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [balaoAberto])

  // URL wa.me memoizada — calculada de forma síncrona pra ser usada como
  // href do anchor (preserva o user-gesture do clique).
  const whatsAppUrl = useMemo(() => {
    const baseMessage =
      isSeoPage(currentPage) && !vehicleBrand
        ? context.message
        : generateVehicleMessage(vehicleBrand, vehicleModel, vehicleYear, geoLocation)
    // SEM [ref: ...] na mensagem (decisão de 05/08, reconfirmada em 05/10/2026):
    // o código aparecia no texto do cliente. A ligação conversa↔clique vai pelo
    // aviso de clique à Fykos, que leva este mesmo texto (aviso-clique-fykos.ts).
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(baseMessage)}`
  }, [currentPage, vehicleBrand, vehicleModel, vehicleYear, geoLocation, context.message])

  // Disparado pelo clique no anchor — fire-and-forget de analytics e
  // webhook. Nada aqui pode aguardar promise, senão o navegador descarta
  // o user-gesture e o popup blocker entra.
  const handleAnchorClick = () => {
    setHasInteracted(true)
    setIsOpen(false)
    try {
      sessionStorage.setItem(BALAO_VISTO, '1')
    } catch {}

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

    // A conversão do OpenAI Ads NÃO é medida aqui. Quem mede é o ouvinte
    // delegado em openai-pixel.tsx, que cobre os 37 pontos de WhatsApp do site
    // — inclusive os 7 da ficha de veículo, que este handler não alcança.
    // Medir também aqui contaria este botão duas vezes.

    // A marcação interna (whatsapp_clicks, aviso ao CRM) NÃO é feita aqui: o
    // ouvinte global do visitor-tracking-provider já registra todo clique em
    // wa.me. Chamar trackInteraction aqui também gravava cada clique DUAS vezes
    // (117 "cliques" em 24h eram ~58 em 29/09). O veículo chega a ele pelo
    // `data-vehicle-id` do anchor.

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
        data-vehicle-id={vehicleId || undefined}
        // Alvo da regra que esconde o círculo enquanto a barra de preço da
        // ficha está na tela (celular). Ver barra-preco-ficha.tsx.
        data-whatsapp-flutuante=""
        onClick={handleAnchorClick}
        aria-hidden={!pronto}
        tabIndex={pronto ? undefined : -1}
        style={{
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        }}
        className={cn(
          // Escuro nos dois temas, com o glifo do WhatsApp: o verde brigava
          // com o preto e vermelho da Attra.
          'fixed right-4 sm:right-6 z-50 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white ring-1 ring-white/15 shadow-lg shadow-black/30 transition-all duration-300 hover:scale-105',
          // Invisível e sem receber toque até `pronto` — o toque não "atravessa"
          // para o WhatsApp; cai no que estiver por baixo, como se o botão não existisse.
          pronto ? 'opacity-100' : 'opacity-0 pointer-events-none',
          // Pulse-glow limitado a ~4 ciclos (8s) pra não drenar bateria
          !hasInteracted && 'animate-pulse-glow [animation-iteration-count:4]',
        )}
        aria-label="Falar pelo WhatsApp"
      >
        <IconeWhatsApp className="w-6 h-6 sm:w-7 sm:h-7" />
      </a>

      {/* Backdrop tocável em mobile pra fechar o tooltip */}
      {balaoAberto && (
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
          'fixed right-4 sm:right-6 z-50 bg-neutral-950 text-white border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-5 transition-all duration-300',
          // Mobile: largura adaptativa (viewport - 2rem), max 20rem
          // Desktop (sm+): largura fixa 18rem
          'w-[calc(100vw-2rem)] max-w-xs sm:w-72',
          balaoAberto ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
        )}
      >
        <button
          onClick={() => {
            setIsOpen(false)
            setHasInteracted(true)
          }}
          className="absolute top-3 right-3 p-1 text-white/60 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-xl shrink-0 bg-white/10">
            <IconeWhatsApp className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">{context.title}</p>
            {context.subtitle && (
              <p className="text-white/70 text-sm">{context.subtitle}</p>
            )}
          </div>
        </div>

        {/* CTA do tooltip — anchor direto (sem await) */}
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAnchorClick}
          className="w-full flex items-center justify-center gap-2 text-white rounded-xl py-3 px-4 font-medium transition-colors btn-press bg-primary hover:bg-primary-hover"
        >
          <IconeWhatsApp className="w-5 h-5" />
          {context.buttonText}
        </a>
      </div>
    </>
  )
}
