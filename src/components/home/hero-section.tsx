import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Search } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { anosDeMercado } from '@/lib/constants'

export function HeroSection() {
  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] flex items-center bg-gradient-to-br from-background via-background to-background-soft">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(154,28,28,0.05),transparent_50%)]" />
      
      <Container className="relative z-10 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
              Curadoria em veículos premium
            </div>
            
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
              <span className="text-engraved">Attra Veículos</span>
              <span className="block text-primary">Uberlândia</span>
            </h1>
            
            <p className="text-lg text-foreground-secondary max-w-lg">
              Curadoria e comercialização de veículos nacionais, importados, esportivos e supercarros, com operação em Uberlândia e atendimento em todo o Brasil.
            </p>

            {/* Quick Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/veiculos" className="flex-1">
                <div className="flex items-center gap-3 px-4 py-3 bg-background-card border border-border rounded-lg hover:border-primary transition-colors cursor-pointer">
                  <Search className="w-5 h-5 text-foreground-secondary" />
                  <span className="text-foreground-secondary">Buscar por marca ou modelo...</span>
                </div>
              </Link>
              <Button size="lg" asChild>
                <Link href="/veiculos" className="flex items-center gap-2">
                  Ver Veículos <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
              <div>
                <p className="text-2xl lg:text-3xl font-bold text-primary">500+</p>
                <p className="text-sm text-foreground-secondary">Veículos vendidos</p>
              </div>
              <div>
                <p className="text-2xl lg:text-3xl font-bold text-primary">{anosDeMercado()}</p>
                <p className="text-sm text-foreground-secondary">Anos de mercado</p>
              </div>
              <div>
                <p className="text-2xl lg:text-3xl font-bold text-primary">2</p>
                <p className="text-sm text-foreground-secondary">Showrooms</p>
              </div>
            </div>
          </div>

          {/* Hero Image Placeholder */}
          <div className="relative hidden lg:block">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-background-card border border-border">
              <div className="absolute inset-0 flex items-center justify-center text-foreground-secondary">
                <div className="text-center">
                  <p className="text-lg font-medium">Imagem do Veículo em Destaque</p>
                  <p className="text-sm">Porsche 911 Carrera GTS 2026</p>
                </div>
              </div>
            </div>
            {/* Floating card */}
            <div className="absolute -bottom-6 -left-6 bg-background-card border border-border rounded-xl p-4 shadow-lg">
              <p className="text-sm text-foreground-secondary">A partir de</p>
              <p className="text-2xl font-bold text-primary">R$ 890.000</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

