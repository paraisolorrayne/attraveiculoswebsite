'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, CarFront, MessageCircle, Building2, Menu } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/constants'
import { useVehicleContext } from '@/contexts/vehicle-context'
import { getContextMessage } from '@/components/layout/whatsapp-button'
import { cn } from '@/lib/utils'
import { EVENTO_ABRIR_MENU } from '@/lib/navegacao'

const ABAS = [
  { rotulo: 'Início', href: '/', icone: House, ativa: (p: string) => p === '/' },
  { rotulo: 'Estoque', href: '/veiculos', icone: CarFront, ativa: (p: string) => p.startsWith('/veiculos') || p.startsWith('/veiculo/') || p.startsWith('/comprar') },
  { rotulo: 'Sobre', href: '/sobre', icone: Building2, ativa: (p: string) => p.startsWith('/sobre') },
] as const

/**
 * Barra de abas do celular, como num aplicativo: Início, Estoque, WhatsApp
 * (no centro, em destaque), Sobre e Menu. Substitui no celular o círculo
 * verde flutuante e os botões "Estoque" e ☰ do cabeçalho.
 *
 * A aba do WhatsApp usa a mesma mensagem do círculo (com o carro, na ficha) e
 * o mesmo `data-vehicle-id`, que o rastreio global de cliques lê. Na ficha,
 * quando a barra de preço aparece, esta barra desce e dá lugar a ela
 * (motion.css).
 */
export function TabBarCelular() {
  const pathname = usePathname()
  const { vehicle } = useVehicleContext()
  const mensagem = getContextMessage(pathname, vehicle?.vehicleBrand, vehicle?.vehicleModel).message

  const [inicio, estoque, sobre] = ABAS

  const aba = (item: (typeof ABAS)[number]) => {
    const ativa = item.ativa(pathname)
    const Icone = item.icone
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={ativa ? 'page' : undefined}
        className={cn(
          'relative flex flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[10px] tracking-wide transition-colors',
          ativa ? 'text-foreground' : 'text-foreground-secondary active:text-foreground',
        )}
      >
        {ativa && <span className="absolute top-0 h-0.5 w-6 rounded-full bg-primary" aria-hidden="true" />}
        <Icone className="h-[22px] w-[22px]" strokeWidth={ativa ? 2 : 1.6} aria-hidden="true" />
        {item.rotulo}
      </Link>
    )
  }

  return (
    <nav
      data-tab-bar
      aria-label="Navegação principal"
      className="tab-bar-celular lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch px-2">
        {aba(inicio)}
        {aba(estoque)}
        <a
          href={getWhatsAppUrl(mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          data-vehicle-id={vehicle?.vehicleId || undefined}
          aria-label="Falar pelo WhatsApp"
          className="flex flex-1 items-center justify-center"
        >
          {/* Dentro da barra, sem saltar para cima: o círculo saliente cobria
              o conteúdo logo acima (o preço do card, na home). */}
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-500 text-white shadow-md shadow-black/30 transition-transform active:scale-95">
            <MessageCircle className="h-[22px] w-[22px]" aria-hidden="true" />
          </span>
        </a>
        {aba(sobre)}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_MENU))}
          className="flex flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[10px] tracking-wide text-foreground-secondary active:text-foreground"
        >
          <Menu className="h-[22px] w-[22px]" strokeWidth={1.6} aria-hidden="true" />
          Menu
        </button>
      </div>
    </nav>
  )
}
