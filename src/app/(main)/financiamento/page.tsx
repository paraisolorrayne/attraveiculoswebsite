import { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { FinancingForm } from '@/components/forms/financing-form'
import { Check, Clock, Percent, Car } from 'lucide-react'
import { metadadosDaPagina } from '@/lib/seo/page-metadata'

export const metadata: Metadata = metadadosDaPagina('/financiamento', {
  titulo: 'Financiamento',
  descricao: 'Simule o financiamento na Attra Veículos: entrada a partir de 20%, até 60 parcelas e o seu carro como parte da entrada.',
  complemento: 'Simulação com um consultor da Attra, em Uberlândia, para carros de todo o estoque.',
})

// Auditoria de 20/11/2026: os destaques diziam "Taxas competitivas",
// "Resposta em até 2 horas" (a FAQ diz "após a documentação completa") e "as
// melhores condições do mercado". Agora cada destaque traz a condição junto.
// Taxa de juros não aparece no site: a Attra não consegue garantir um número,
// que depende do perfil de crédito e da instituição (decisão de 20/11/2026).
const benefits = [
  { icon: Percent, title: 'Entrada a partir de 20%', description: 'Parcelamento em até 60 meses, conforme a análise de crédito.' },
  { icon: Clock, title: 'Resposta em até 2 horas', description: 'Depois do envio da documentação completa.' },
  { icon: Car, title: 'Seu carro na entrada', description: 'Avaliamos o seu veículo e o valor entra como parte do pagamento.' },
]

const requirements = [
  'Documento de identidade (RG ou CNH)',
  'CPF',
  'Comprovante de residência atualizado',
  'Comprovante de renda (3 últimos meses)',
  'Imposto de Renda (se disponível)',
]

const faq = [
  { q: 'Qual o valor mínimo de entrada?', a: 'Trabalhamos com entrada a partir de 20% do valor do veículo, podendo variar conforme análise de crédito.' },
  { q: 'Em quantas vezes posso parcelar?', a: 'Em até 60 vezes, conforme a análise de crédito.' },
  { q: 'Posso usar meu carro como entrada?', a: 'Sim. Avaliamos o seu veículo atual e o valor entra como parte do pagamento.' },
  { q: 'Quanto tempo leva para aprovar?', a: 'A aprovação geralmente ocorre em até 2 horas após o envio da documentação completa.' },
]

export default function FinanciamentoPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-16 lg:pt-32 lg:pb-24 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb items={[{ label: 'Serviços', href: '/servicos' }, { label: 'Financiamento', href: '/financiamento' }]} afterHero />
          <div className="max-w-3xl mx-auto text-center mt-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">Financiamento</h1>
            <p className="text-lg text-foreground-secondary">
              Entrada a partir de 20%, parcelamento em até 60 meses e o seu carro como parte da entrada.
              Um consultor da Attra faz a simulação com você, para qualquer veículo do estoque.
            </p>
          </div>
        </Container>
      </section>

      {/* Benefits */}
      <section className="py-12 bg-primary">
        <Container>
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex items-center gap-4 text-white">
                <benefit.icon className="w-12 h-12 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-lg">{benefit.title}</p>
                  <p className="text-white/80">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Form and Info */}
      <section className="py-16 bg-background">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Solicite sua simulação</h2>
              <FinancingForm />
            </div>

            {/* Requirements */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Documentos necessários</h2>
              <div className="bg-background-card border border-border rounded-xl p-6 mb-8">
                <ul className="space-y-3">
                  {requirements.map((req) => (
                    <li key={req} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{req}</span>
                    </li>
                  ))}
                </ul>
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

