import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { WhatsAppButton } from '@/components/layout/whatsapp-button'
import { TabBarCelular } from '@/components/layout/tab-bar-celular'
import { RevelarAoRolar } from '@/components/ui/revelar-ao-rolar'
import { AberturaAttra } from '@/components/home/abertura-attra'
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
      {/* Antes de tudo: o script da abertura decide antes da primeira pintura. */}
      <AberturaAttra />
      <RacingProgress />
      {/* Folga embaixo no celular para a barra de abas não cobrir o rodapé. */}
      <div className="flex flex-col min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <WhatsAppButton />
      <TabBarCelular />
      <RevelarAoRolar />
      <StickyContactForm />
    </VehicleProvider>
  )
}

