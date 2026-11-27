interface FAQItem {
  question: string
  answer: string
}

interface FAQSchemaProps {
  faqs: FAQItem[]
  pageName?: string
}

export function FAQSchema({ faqs, pageName }: FAQSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: pageName ? `Perguntas Frequentes - ${pageName}` : 'Perguntas Frequentes - Attra Veículos',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Pre-defined FAQ content for different pages
export const homeFAQs: FAQItem[] = [
  {
    question: 'Onde fica a Attra Veículos?',
    answer: 'A Attra Veículos fica na Av. Rondon Pacheco, 1670 - Vigilato Pereira, Uberlândia - MG, 38408-343. Atendemos clientes de todo o Brasil com entrega nacional.',
  },
  {
    question: 'Que tipos de veículos a Attra comercializa?',
    answer: 'A Attra é especializada em veículos premium, importados, seminovos selecionados e supercarros. Trabalhamos com marcas como Ferrari, Lamborghini, Porsche, BMW, Mercedes-Benz, Audi, Land Rover, entre outras.',
  },
  {
    question: 'A Attra oferece financiamento?',
    answer: 'Sim. O financiamento cobre até 80% do valor do veículo, em até 60 parcelas, com análise de crédito personalizada para cada cliente.',
  },
  {
    question: 'Como funciona a compra de um veículo na Attra?',
    answer: 'O processo é simples: você pode visitar nossa loja ou nos contatar pelo WhatsApp. Nossos consultores especializados apresentam os veículos, tiram todas as dúvidas, e cuidamos de toda a documentação e transferência.',
  },
  {
    question: 'A Attra entrega veículos em todo o Brasil?',
    answer: 'Sim, realizamos entrega nacional com logística especializada para veículos de alto valor, incluindo transporte em caminhão fechado, seguro completo e rastreamento em tempo real.',
  },
]

export const veiculosFAQs: FAQItem[] = [
  {
    question: 'Como posso reservar um veículo da Attra?',
    answer: 'Para reservar um veículo, entre em contato pelo WhatsApp ou visite nossa loja. A reserva é confirmada após sinal e análise de crédito (se for financiamento). Nossos consultores te guiam em todo o processo.',
  },
  {
    question: 'Os veículos possuem garantia?',
    answer: 'Sim, todos os veículos seminovos passam por inspeção de 200 pontos e têm garantia. Veículos 0km mantêm a garantia de fábrica. Detalhes específicos variam conforme o veículo.',
  },
  {
    question: 'Posso agendar um test drive?',
    answer: 'Sim, oferecemos test drive para clientes qualificados. Agende pelo WhatsApp ou telefone informando o veículo de interesse. O test drive é realizado com acompanhamento de consultor especializado.',
  },
  {
    question: 'A Attra aceita meu carro como parte do pagamento?',
    answer: 'Sim, avaliamos seu veículo atual e oferecemos valor justo de mercado como parte do pagamento. Nossa equipe faz avaliação profissional considerando estado, quilometragem e demanda de mercado.',
  },
  {
    question: 'Com que frequência novos veículos chegam à Attra?',
    answer: 'Nosso acervo é atualizado constantemente. Novos veículos chegam semanalmente. Você pode se cadastrar para receber alertas de novos modelos das marcas de seu interesse.',
  },
]

export const servicosFAQs: FAQItem[] = [
  {
    question: 'Quais serviços a Attra Veículos oferece?',
    answer: 'A Attra oferece três serviços principais: importação sob medida de veículos de luxo e superesportivos, financiamento premium com condições especiais, e consignado automotivo para venda segura do seu veículo.',
  },
  {
    question: 'Como funciona a importação de veículos na Attra?',
    answer: 'A importação é um processo completo de 60 a 90 dias: realizamos curadoria internacional, negociação com dealers certificados, logística, desembaraço aduaneiro, homologação DENATRAN/INMETRO e entrega VIP.',
  },
  {
    question: 'Quais são as condições do financiamento premium?',
    answer: 'Financiamento de até 80% do valor do veículo, em até 60 parcelas, com análise de crédito personalizada.',
  },
  {
    question: 'Como funciona o consignado automotivo?',
    answer: 'Você deixa seu veículo conosco para venda. A Attra cuida de toda negociação, exposição em showroom premium e canais digitais, avaliação profissional e precificação competitiva. Zero burocracia.',
  },
  {
    question: 'A Attra atende clientes de outros estados?',
    answer: 'Sim, atendemos clientes em todo o território nacional. Realizamos atendimento remoto via WhatsApp e videochamada, e entregamos veículos em qualquer cidade do Brasil com logística especializada.',
  },
]

