import { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { VehicleRequestForm } from '@/components/forms/vehicle-request-form'
import { Search, Check, Globe, Shield } from 'lucide-react'
import { canonicalUrl } from '@/lib/seo/page-metadata'

export const metadata: Metadata = {
  title: 'Solicitar Veículo',
  description: 'Não encontrou o veículo que procura? A Attra Veículos busca para você. Serviço personalizado e sem compromisso.',
  alternates: { canonical: canonicalUrl('/solicitar-veiculo') },
}

const features = [
  { icon: Search, title: 'Busca Personalizada', description: 'Encontramos exatamente o veículo que você procura.' },
  { icon: Globe, title: 'Rede Nacional', description: 'Buscamos em todo o Brasil para encontrar o melhor.' },
  { icon: Shield, title: 'Garantia de Procedência', description: 'Todos os veículos passam por nossa inspeção.' },
  { icon: Check, title: 'Sem Compromisso', description: 'Você só fecha se aprovar o veículo encontrado.' },
]

const faq = [
  { q: 'Quanto tempo leva para encontrar?', a: 'O prazo varia conforme a disponibilidade do modelo. Em média, de 7 a 30 dias.' },
  { q: 'Há algum custo pelo serviço?', a: 'Não! A busca é totalmente gratuita. Você só paga se decidir comprar o veículo.' },
  { q: 'Posso solicitar veículos de qualquer marca?', a: 'Sim, buscamos veículos de todas as marcas premium, nacionais e importados.' },
  { q: 'Como funciona a garantia?', a: 'Passam por verificação de documentação, mecânica e originalidade. Notas de leilão, histórico suspeito e remaps não serão aceitos.' },
]

export default function SolicitarVeiculoPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-16 lg:pt-32 lg:pb-24 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb items={[{ label: 'Serviços', href: '/servicos' }, { label: 'Solicitar Veículo', href: '/solicitar-veiculo' }]} afterHero />
          <div className="max-w-3xl mx-auto text-center mt-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">Solicitar Veículo</h1>
            <p className="text-lg text-foreground-secondary">
              Não encontrou o carro dos seus sonhos em nosso acervo?
              Nossa equipe busca em todo o Brasil para você.
            </p>
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-12 bg-primary">
        <Container>
          <div className="grid md:grid-cols-4 gap-6 text-white">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <feature.icon className="w-10 h-10 mx-auto mb-3" />
                <p className="font-semibold">{feature.title}</p>
                <p className="text-sm text-white/80">{feature.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Form and FAQ */}
      <section className="py-16 bg-background">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Descreva o veículo desejado</h2>
              <VehicleRequestForm />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Como funciona</h2>
              <div className="space-y-4 mb-8">
                <div className="flex gap-4">
                  <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
                  <div>
                    <p className="font-medium text-foreground">Envie sua solicitação</p>
                    <p className="text-sm text-foreground-secondary">Preencha o formulário com as características desejadas.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
                  <div>
                    <p className="font-medium text-foreground">Iniciamos a busca</p>
                    <p className="text-sm text-foreground-secondary">Nossa rede nacional procura o veículo ideal.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</span>
                  <div>
                    <p className="font-medium text-foreground">Apresentamos opções</p>
                    <p className="text-sm text-foreground-secondary">Você recebe as melhores opções encontradas.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">4</span>
                  <div>
                    <p className="font-medium text-foreground">Feche o negócio</p>
                    <p className="text-sm text-foreground-secondary">Aprovou? Cuidamos de toda a logística.</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold text-foreground mb-4">Perguntas frequentes</h3>
              <div className="space-y-4">
                {faq.map((item) => (
                  <div key={item.q} className="bg-background-card border border-border rounded-xl p-4">
                    <p className="font-medium text-foreground mb-1">{item.q}</p>
                    <p className="text-sm text-foreground-secondary">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}

