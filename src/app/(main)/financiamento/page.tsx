import { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { FinancingForm } from '@/components/forms/financing-form'
import { Check, Shield, Clock, Percent } from 'lucide-react'
import { canonicalUrl } from '@/lib/seo/page-metadata'

export const metadata: Metadata = {
  title: 'Financiamento',
  description: 'Simule seu financiamento na Attra Veículos. Taxas a partir de 0,99% a.m., aprovação rápida e sem burocracia.',
  alternates: { canonical: canonicalUrl('/financiamento') },
}

const benefits = [
  { icon: Percent, title: 'Taxas competitivas', description: 'A partir de 0,99% ao mês' },
  { icon: Clock, title: 'Aprovação rápida', description: 'Resposta em até 2 horas' },
  { icon: Shield, title: 'Sem burocracia', description: 'Processo 100% digital' },
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
  { q: 'Em quantas vezes posso parcelar?', a: 'Oferecemos parcelamento em até 60 vezes, com parcelas que cabem no seu bolso.' },
  { q: 'Qual a taxa de juros?', a: 'Nossas taxas começam a partir de 0,99% ao mês, variando conforme perfil e instituição financeira.' },
  { q: 'Posso usar meu carro como entrada?', a: 'Sim! Avaliamos seu veículo atual e utilizamos o valor como parte do pagamento.' },
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
              Realize o sonho do seu carro premium com as melhores condições do mercado.
              Aprovação rápida, taxas competitivas e sem burocracia.
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

