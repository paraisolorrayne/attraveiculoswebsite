import { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { FileText, Scale, AlertTriangle, Ban, Copyright, RefreshCw, Gavel, Mail } from 'lucide-react'
import { canonicalUrl } from '@/lib/seo/page-metadata'

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Termos e Condições de Uso do site da Attra Veículos. Leia atentamente antes de utilizar nossos serviços.',
  alternates: { canonical: canonicalUrl('/termos-uso') },
}

const sections = [
  {
    icon: FileText,
    title: '1. Aceitação dos Termos',
    content: `Ao acessar e utilizar o site da Attra Veículos (attraveiculos.com.br), você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nosso site.

Estes termos podem ser atualizados a qualquer momento, sem aviso prévio. O uso continuado do site após alterações constitui aceitação dos novos termos.`
  },
  {
    icon: Scale,
    title: '2. Uso do Site',
    content: `O site da Attra Veículos destina-se a:

• Apresentar nosso estoque de veículos premium
• Fornecer informações sobre nossos serviços
• Permitir contato entre você e nossa equipe comercial
• Oferecer conteúdo educativo sobre o mercado automotivo

Você concorda em utilizar o site apenas para fins legais e de acordo com estes termos. É proibido qualquer uso que possa danificar, desabilitar ou sobrecarregar nossos sistemas.`
  },
  {
    icon: AlertTriangle,
    title: '3. Informações sobre Veículos',
    content: `As informações apresentadas sobre os veículos em nosso site são fornecidas de boa-fé e com base nos dados disponíveis no momento da publicação. No entanto:

• Preços, disponibilidade e especificações podem sofrer alterações sem aviso prévio
• Fotos são meramente ilustrativas e podem não refletir exatamente o veículo
• Condições especiais de pagamento estão sujeitas à aprovação de crédito
• A Attra reserva-se o direito de corrigir erros de publicação a qualquer momento

Recomendamos sempre confirmar informações diretamente com nossa equipe antes de tomar decisões de compra.`
  },
  {
    icon: Ban,
    title: '4. Condutas Proibidas',
    content: `Ao utilizar nosso site, você concorda em NÃO:

• Fornecer informações falsas ou enganosas em formulários
• Utilizar o site para qualquer finalidade ilegal ou fraudulenta
• Tentar acessar áreas restritas do site sem autorização
• Coletar informações de outros usuários sem consentimento
• Transmitir vírus, malware ou qualquer código malicioso
• Sobrecarregar nossos servidores com requisições automatizadas
• Reproduzir, modificar ou distribuir nosso conteúdo sem autorização

Violações podem resultar em bloqueio de acesso e medidas legais cabíveis.`
  },
  {
    icon: Copyright,
    title: '5. Propriedade Intelectual',
    content: `Todo o conteúdo do site, incluindo mas não limitado a:

• Textos, imagens, vídeos e gráficos
• Logotipos, marcas e identidade visual
• Layout, design e estrutura do site
• Software e códigos-fonte

É de propriedade exclusiva da Attra Veículos ou de seus licenciadores, protegido pelas leis de direitos autorais e propriedade intelectual.

É permitido apenas o uso pessoal e não comercial do conteúdo, com devida atribuição à fonte.`
  },
  {
    icon: RefreshCw,
    title: '6. Limitação de Responsabilidade',
    content: `A Attra Veículos não se responsabiliza por:

• Danos decorrentes do uso ou impossibilidade de uso do site
• Interrupções temporárias no serviço por manutenção ou problemas técnicos
• Conteúdo de sites de terceiros acessados através de links em nosso site
• Perdas ou danos resultantes de informações desatualizadas ou incorretas
• Decisões tomadas com base exclusivamente nas informações do site

O site é fornecido "como está", sem garantias de qualquer tipo, expressas ou implícitas.`
  },
  {
    icon: Gavel,
    title: '7. Lei Aplicável e Foro',
    content: `Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil.

Qualquer disputa relacionada a estes termos será submetida ao foro da comarca de Uberlândia - MG, com exclusão de qualquer outro, por mais privilegiado que seja.`
  },
  {
    icon: Mail,
    title: '8. Contato',
    content: `Para dúvidas, sugestões ou reclamações sobre estes Termos de Uso, entre em contato:

• **E-mail**: contato@attraveiculos.com.br
• **Telefone**: (34) 3236-4747
• **WhatsApp**: (34) 99944-4747
• **Endereço**: Av. Rondon Pacheco, Uberlândia - MG

**Última atualização**: Fevereiro de 2026`
  },
]

export default function TermosUsoPage() {
  return (
    <>
      <section className="pt-28 pb-12 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb items={[{ label: 'Termos de Uso', href: '/termos-uso' }]} afterHero />
          <div className="max-w-3xl mx-auto text-center mt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <Gavel className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Termos Legais</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">Termos de Uso</h1>
            <p className="text-lg text-foreground-secondary">
              Leia atentamente os termos e condições de uso do site da Attra Veículos.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-16 bg-background">
        <Container>
          <div className="max-w-4xl mx-auto space-y-8">
            {sections.map((section) => (
              <div key={section.title} className="bg-background-card border border-border rounded-2xl p-6 lg:p-8">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                    <section.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-4">{section.title}</h2>
                    <div className="text-foreground-secondary leading-relaxed whitespace-pre-line prose prose-sm max-w-none">
                      {section.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}

