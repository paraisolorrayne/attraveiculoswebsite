import { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { LeadMagnetForm } from './lead-magnet-form'
import { Shield, FileText, CheckCircle, Car, BookOpen, TrendingUp } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Guia Definitivo para Comprar Supercarros com Segurança | Attra Veículos',
  description: 'Baixe gratuitamente o guia completo com 8 páginas de dicas exclusivas para comprar supercarros e veículos de luxo com total segurança. Curadoria Attra Veículos.',
  keywords: 'guia supercarros, como comprar supercarro, comprar ferrari, comprar lamborghini, guia veículos de luxo, dicas compra carro premium',
  openGraph: {
    title: 'Guia Definitivo para Comprar Supercarros com Segurança',
    description: 'Baixe gratuitamente o guia completo com dicas exclusivas para comprar supercarros e veículos de luxo.',
    type: 'website',
    images: ['/images/guia-supercarro-cover.jpg'],
  },
}

const guideFeatures = [
  {
    icon: Shield,
    title: 'Verificação de Procedência',
    description: 'Como verificar histórico, documentação e garantir autenticidade do veículo',
  },
  {
    icon: FileText,
    title: 'Documentação Necessária',
    description: 'Checklist completo de documentos para uma compra segura',
  },
  {
    icon: TrendingUp,
    title: 'Análise de Valorização',
    description: 'Quais modelos valorizam e como identificar boas oportunidades',
  },
  {
    icon: Car,
    title: 'Inspeção Técnica',
    description: 'Os 50 pontos essenciais para verificar antes de fechar negócio',
  },
]

const guideChapters = [
  'Introdução ao universo dos supercarros',
  'Como identificar vendedores confiáveis',
  'Verificação de procedência e histórico',
  'Inspeção técnica: o que observar',
  'Documentação e transferência segura',
  'Financiamento e formas de pagamento',
  'Manutenção e custos de propriedade',
  'Valorização e revenda estratégica',
]

export default function GuiaSupercarroPage() {
  return (
    <main className="bg-gradient-to-b from-background-soft to-background min-h-screen">
      {/* Hero Section */}
      <section className="pt-28 pb-16">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">E-book Gratuito</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                Guia Definitivo para{' '}
                <span className="text-metallic text-metallic-animate">Comprar Supercarros</span>{' '}
                com Segurança
              </h1>
              
              <p className="text-lg text-foreground-secondary mb-8 leading-relaxed">
                Mais de <strong className="text-foreground">18 anos de experiência</strong> no mercado de veículos premium
                condensados em um guia prático de 8 páginas. Aprenda a evitar golpes, verificar procedência 
                e fazer o melhor negócio.
              </p>

              {/* Features Grid */}
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {guideFeatures.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3 p-3 bg-background-card rounded-lg border border-border">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <feature.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground text-sm">{feature.title}</h3>
                      <p className="text-xs text-foreground-secondary mt-0.5">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Form Card */}
            <div className="bg-background-card border border-border rounded-2xl shadow-2xl shadow-black/10 overflow-hidden">
              <div className="bg-primary px-6 py-4">
                <h2 className="text-xl font-bold text-white">Baixe Grátis Agora</h2>
                <p className="text-white/80 text-sm mt-1">Preencha seus dados para receber o guia</p>
              </div>
              <div className="p-6">
                <LeadMagnetForm />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Chapters Section */}
      <section className="py-16 bg-background">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground text-center mb-8">
              O Que Você Vai Aprender
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {guideChapters.map((chapter, index) => (
                <div key={chapter} className="flex items-center gap-3 p-4 bg-background-card rounded-lg border border-border">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <span className="text-foreground">{chapter}</span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-background-soft">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} className="w-6 h-6 text-yellow-500 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              ))}
            </div>
            <p className="text-lg text-foreground-secondary mb-6">
              &ldquo;Este guia me salvou de um golpe de R$ 800 mil. Identifiquei todas as red flags 
              que a Attra descreve no material.&rdquo;
            </p>
            <p className="font-medium text-foreground">Carlos M. - São Paulo, SP</p>
            <p className="text-sm text-foreground-secondary">Cliente Attra desde 2019</p>
          </div>
        </Container>
      </section>
    </main>
  )
}

