import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { WhatsAppButton } from '@/components/layout/whatsapp-button'
import { RacingProgress } from '@/components/ui/racing-progress'
import { VehicleProvider } from '@/contexts/vehicle-context'
import { StickyContactForm } from '@/components/forms'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // AutoDealer e WebSite NÃO são emitidos aqui: o layout raiz
  // (src/app/layout.tsx) já declara os dois com @id em todo documento. Emitir
  // de novo neste layout duplicava a entidade em toda página interna, com
  // endereço e horário divergentes do nó canônico.
  return (
    <VehicleProvider>
      <RacingProgress />
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 page-enter">{children}</main>
        <Footer />
      </div>
      <WhatsAppButton />
      <StickyContactForm />
    </VehicleProvider>
  )
}

