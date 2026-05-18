import { Metadata } from 'next'
import Link from 'next/link'
import { Camera, ArrowLeft, ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Nossa História | Attra Veículos — De onde viemos, para onde vamos',
  description: 'Conheça a evolução da Attra Veículos em imagens. Uma galeria documental que mostra o que éramos, o que construímos e o que estamos nos tornando.',
  keywords: ['história Attra Veículos', 'evolução Attra', 'galeria Attra', 'documentário Attra Veículos'],
}

export default function NossaHistoriaPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative pt-28 pb-16 lg:pt-32 lg:pb-24 bg-gradient-to-br from-background via-background-soft to-background overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
        </div>
        <Container className="relative z-10 mb-8">
          <Breadcrumb items={[
            { label: 'Sobre a Attra', href: '/sobre' },
            { label: 'Nossa História', href: '/nossa-historia' },
          ]} afterHero />
        </Container>
        <Container className="relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <Camera className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Documentário Visual</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              De onde viemos. <span className="text-metallic text-metallic-animate">Para onde vamos.</span>
            </h1>
            <p className="text-lg lg:text-xl text-foreground-secondary mb-8 max-w-3xl mx-auto leading-relaxed">
              Uma galeria que documenta a evolução da Attra — do início familiar em Uberlândia
              à operação que hoje atende colecionadores de todo o Brasil.
            </p>
          </div>
        </Container>
      </section>

      {/* Conteúdo — Em construção */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <Camera className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
              Galeria em preparação
            </h2>
            <p className="text-lg text-foreground-secondary leading-relaxed mb-8">
              Estamos reunindo imagens, vídeos e registros que contam a trajetória da Attra desde 2008.
              Em breve, você poderá navegar por cada capítulo dessa história.
            </p>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
              <Link href="/sobre">
                <ArrowLeft className="w-5 h-5 mr-2" />Voltar para Sobre
              </Link>
            </Button>
          </div>
        </Container>
      </section>
    </>
  )
}

