export interface ConfiancaPage {
	slug: string
	title: string
	metaTitle: string
	metaDescription: string
	keywords: string[]
	sections: { heading: string; content: string }[]
	ctaText: string
}

export const CONFIANCA_PAGES: ConfiancaPage[] = [
	{
		slug: 'por-que-comprar-na-attra',
		title: 'Por Que Comprar na Attra',
		metaTitle: 'Por Que Comprar na Attra | Diferenciais Reais | Attra Veículos',
		metaDescription: 'Por que comprar seu veículo de luxo na Attra. Processo completo, diferenciais reais e segurança na transação. Attra Veículos.',
		keywords: ['por que comprar na attra', 'attra veículos diferenciais', 'comprar carro luxo seguro', 'loja veículos premium confiável'],
		sections: [
			{ heading: 'Curadoria rigorosa de estoque', content: 'Cada veículo que entra no estoque da Attra passa por avaliação detalhada. Verificamos procedência, histórico de manutenção, condição real de pintura e mecânica, e documentação completa. Rejeitamos veículos que não atendem nossos critérios, independente do potencial de lucro.' },
			{ heading: 'Mais de 17 anos de mercado', content: 'A Attra Veículos opera desde 2008 em Uberlândia, Minas Gerais. São mais de 17 anos construindo reputação com transações transparentes e clientes satisfeitos em todo o Brasil.' },
			{ heading: 'Processo transparente de compra', content: 'Da escolha do veículo ao recebimento na sua porta, cada etapa é comunicada com clareza. Sem surpresas, sem custos ocultos e sem pressão de venda. Você decide no seu tempo com todas as informações disponíveis.' },
			{ heading: 'Suporte pós-venda', content: 'A relação não termina na entrega. Oferecemos suporte para questões de documentação, indicação de oficinas especializadas e acompanhamento do veículo após a compra.' },
			{ heading: 'Entrega nacional especializada', content: 'Entregamos em todo o Brasil com caminhão fechado, seguro completo e rastreamento em tempo real. O veículo sai do nosso estoque e chega à sua porta com a mesma condição.' },
		],
		ctaText: 'Conheça nosso estoque com procedência verificada',
	},
	{
		slug: 'garantia-e-procedencia',
		title: 'Garantia e Procedência',
		metaTitle: 'Garantia e Procedência | Veículos Verificados | Attra Veículos',
		metaDescription: 'Como a Attra garante procedência e qualidade de cada veículo. Processo de validação, garantia e segurança. Attra Veículos.',
		keywords: ['garantia carro luxo', 'procedência veículo premium', 'garantia attra veículos', 'carro luxo com garantia'],
		sections: [
			{ heading: 'Processo de validação', content: 'Cada veículo passa por inspeção em múltiplas etapas: verificação documental completa (Detran, multas, sinistros, alienação), laudo cautelar por empresa independente, análise de pintura com medidor de espessura, teste de sistemas eletrônicos e mecânicos, e avaliação de desgaste compatível com quilometragem declarada.' },
			{ heading: 'Documentação garantida', content: 'Todos os veículos são entregues com documentação completa e regular. Transferência facilitada, IPVA verificado e nenhuma pendência administrativa. A Attra assume responsabilidade pela regularidade documental no momento da venda.' },
			{ heading: 'Histórico de manutenção', content: 'Priorizamos veículos com histórico completo na rede autorizada. Quando o histórico é parcial, informamos com transparência quais registros estão disponíveis e quais verificações complementares foram realizadas.' },
			{ heading: 'Garantia Attra', content: 'Oferecemos garantia nos veículos comercializados conforme as condições estabelecidas para cada veículo. Os termos específicos são apresentados antes da finalização da compra, sem ambiguidade.' },
			{ heading: 'Segurança da transação', content: 'Pagamentos processados por canais bancários formais. Contratos detalhados com todas as condições da venda. Nota fiscal emitida para cada transação. Tudo registrado e documentado para segurança de ambas as partes.' },
		],
		ctaText: 'Consultar veículos com procedência verificada',
	},
	{
		slug: 'como-funciona-entrega-brasil',
		title: 'Como Funciona a Entrega no Brasil',
		metaTitle: 'Entrega de Veículos em Todo o Brasil | Attra Veículos',
		metaDescription: 'Como funciona a entrega de veículos de luxo da Attra para todo o Brasil. Logística especializada, seguro e rastreamento. Attra Veículos.',
		keywords: ['entrega veículo luxo brasil', 'transporte carro premium', 'entrega carro luxo nacional', 'logística veículo alto valor'],
		sections: [
			{ heading: 'Escolha e confirmação', content: 'Após escolher seu veículo e finalizar a compra, nossa equipe de logística inicia o planejamento da entrega. Você recebe confirmação com prazo estimado e detalhes do transporte.' },
			{ heading: 'Preparação do veículo', content: 'O veículo passa por preparação final: limpeza completa, verificação de todos os sistemas e documentação fotográfica detalhada do estado antes do embarque. Essas fotos são compartilhadas com você como registro de condição.' },
			{ heading: 'Transporte especializado', content: 'Utilizamos caminhões fechados exclusivos para veículos de alto valor. O veículo é fixado com cintas específicas em plataforma nivelada, protegido contra intempéries e vibrações durante todo o trajeto.' },
			{ heading: 'Seguro completo de transporte', content: 'Todo veículo transportado possui seguro que cobre o valor integral durante o trajeto. Em caso de qualquer intercorrência, a cobertura é total e imediata.' },
			{ heading: 'Rastreamento em tempo real', content: 'Você acompanha o trajeto do seu veículo em tempo real. Nossa equipe envia atualizações e você pode consultar a localização a qualquer momento durante o transporte.' },
			{ heading: 'Entrega e conferência', content: 'Na entrega, você realiza conferência do veículo comparando com as fotos de embarque. Qualquer divergência é tratada imediatamente. Só consideramos a entrega concluída após sua aprovação.' },
			// REVISAR ANUALMENTE — prazos de entrega podem mudar conforme logística
			{ heading: 'Prazos estimados', content: 'Triângulo Mineiro e BH: 1 a 3 dias úteis. São Paulo e Rio de Janeiro: 2 a 4 dias úteis. Demais capitais: 3 a 7 dias úteis. Interior e regiões remotas: 5 a 10 dias úteis. Prazos podem variar conforme condições logísticas.' },
		],
		ctaText: 'Consultar disponibilidade e prazo de entrega',
	},
]

// ---------------------------------------------------------------------------
