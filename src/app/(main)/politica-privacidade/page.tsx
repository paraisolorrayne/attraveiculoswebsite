import { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Shield, Lock, Eye, FileText, UserCheck, MessageCircle, Share2, Mail } from 'lucide-react'
import { canonicalUrl } from '@/lib/seo/page-metadata'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Na Attra Veículos, privacidade e segurança são prioridades. Saiba como coletamos, usamos e protegemos seus dados pessoais ao navegar em nosso site ou interagir via WhatsApp.',
  alternates: { canonical: canonicalUrl('/politica-privacidade') },
}

const sections = [
  {
    icon: Eye,
    title: '1. Coleta de Informações',
    content: `Coletamos dados necessários para oferecer uma experiência personalizada e segura:

• **No Site:** Nome, e-mail, telefone e interesse em modelos específicos através de nossos formulários de contato.
• **Via WhatsApp:** Além dos dados de contato, podemos registrar o histórico de conversas, preferências de veículos e documentos necessários para simulações de financiamento ou faturamento.
• **Cookies:** Utilizamos cookies para melhorar a navegação e entender quais modelos despertam mais interesse em nosso estoque.`
  },
  {
    icon: FileText,
    title: '2. Uso dos Dados',
    content: `Seus dados são utilizados exclusivamente para:

• Responder suas solicitações de orçamento e disponibilidade de estoque.
• Enviar informações sobre novos veículos que correspondam ao seu perfil de busca.
• Processar etapas de compra, venda ou consignação de veículos.
• Garantir a segurança jurídica das transações automotivas.`
  },
  {
    icon: MessageCircle,
    title: '3. Atendimento via WhatsApp',
    content: `Ao iniciar uma conversa conosco via WhatsApp, você concorda que:

• As informações compartilhadas serão utilizadas para agilizar seu atendimento.
• Podemos enviar atualizações sobre o veículo de seu interesse, salvo se você solicitar a interrupção do contato.
• **Segurança:** Nunca solicitaremos senhas ou códigos de confirmação via chat. Documentos sensíveis devem ser enviados apenas para nossos números oficiais.`
  },
  {
    icon: Share2,
    title: '4. Compartilhamento com Terceiros',
    content: `A Attra Veículos não vende seus dados. Compartilhamos informações apenas com parceiros essenciais para a conclusão do seu negócio, tais como:

• Instituições financeiras (para aprovação de crédito).
• Órgãos de trânsito (para transferência de propriedade).
• Empresas de vistorias cautelares.`
  },
  {
    icon: UserCheck,
    title: '5. Seus Direitos',
    content: `De acordo com a **LGPD (Lei Geral de Proteção de Dados)**, você tem o direito de:

• Confirmar a existência do tratamento de seus dados.
• Solicitar a correção de dados incompletos ou desatualizados.
• Solicitar a exclusão de seus dados de nossa base de marketing a qualquer momento.`
  },
  {
    icon: Lock,
    title: '6. Alterações nesta Política',
    content: `Reservamo-nos o direito de atualizar esta política periodicamente para refletir mudanças em nosso estoque ou em regulamentações legais. Recomendamos a leitura regular desta página.

**Última atualização**: Fevereiro de 2026`
  },
]

export default function PoliticaPrivacidadePage() {
  return (
    <>
      <section className="pt-28 pb-12 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb items={[{ label: 'Política de Privacidade', href: '/politica-privacidade' }]} afterHero />
          <div className="max-w-3xl mx-auto text-center mt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">LGPD Compliant</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">Política de Privacidade</h1>
            <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
              Na <strong className="text-foreground">Attra Veículos</strong>, privacidade e segurança são prioridades. Esta política descreve como coletamos, usamos e protegemos seus dados pessoais ao navegar em nosso site ou ao interagir com nossos consultores via WhatsApp.
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

            {/* Contact section */}
            <div className="bg-background-card border border-border rounded-2xl p-6 lg:p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-4">Contato</h2>
                  <p className="text-foreground-secondary leading-relaxed">
                    Para dúvidas sobre seus dados, entre em contato através do e-mail:{' '}
                    <a href="mailto:contato@attraveiculos.com.br" className="text-primary hover:underline font-medium">
                      contato@attraveiculos.com.br
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}

